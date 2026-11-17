"""Judge cut v3: story opening, animated typography, privacy and audio-priority mix.
Requires FFmpeg, Pillow, NumPy. No downloaded media or music samples.
"""
import csv,json,math,re,wave,subprocess
import numpy as np
from PIL import Image,ImageDraw,ImageFilter
import render as base
import render_judges as previous

HERE=base.HERE; WORK=HERE/'work'/'cinematic';WORK.mkdir(parents=True,exist_ok=True)
base.WORK=WORK; previous.WORK=WORK
# A beat contains its narration and the large animated words seen at that moment.
SCENES=[
 dict(kind='story',tag='A TRUE STORY / 2005',beats=[('In December two thousand five, NASA lost contact with IMAGE. The spacecraft went silent.','LOST\nIN SPACE.')],detail='IMAGE / CONTACT LOST',year='2005'),
 dict(kind='story',tag='A TRUE STORY / 2018',beats=[('More than twelve years later, amateur astronomer Scott Tilley found its signal again.','THEN SOMEONE\nHEARD IT.')],detail='SCOTT TILLEY / REDISCOVERY',year='2018'),
 dict(kind='story',tag='KIROWEEN / RESURRECTION',beats=[('What if a phone could help you take the first steps into that world?','YOUR PHONE.\nTHEIR ORBIT.')],detail='FIND / POINT / FOLLOW',year='NOW'),
 dict(kind='phone',tag='01 / THE IDEA',start=8,end=20,focus=12,beats=[('zombieSatellite helps radio hobbyists find a pass, point toward a satellite, and follow its Doppler shift.','KNOW WHEN.\nKNOW WHERE.'),('Seven spacecraft connect the experience to documented history. Five offer playable sessions.','SEVEN STORIES.\nFIVE TO TRY.')],detail='PUBLIC ORBITS\nDOCUMENTED STORIES',steps=['Find the next pass','Point toward the spacecraft','Follow the frequency shift']),
 dict(kind='private',tag='02 / FIND A PASS',beats=[('Public orbital data predicts the next pass over your location. Observer coordinates are hidden here.','THE NEXT PASS.\nYOUR LOCATION.'),('Choose a spacecraft and open its session. Times are shown in coordinated universal time.','PICK A PASS.\nOPEN A SESSION.')],detail='TLE + SGP4\nCOMPUTED PASS TIMES',steps=['Public orbital data','Location-based prediction','Times shown in UTC']),
 dict(kind='phone',tag='03 / POINT',start=30,end=42,focus=38,beats=[('The camera view overlays the computed satellite direction. Switch spacecraft to explore the sky around you.','THE SKY,\nWITH DIRECTIONS.'),('Direction cues and the sky view help you orient the phone, even when an object is off screen.','FIND IT.\nFACE IT.')],detail='AR POINTING\nCAMERA + GEOMETRY',steps=['Computed direction','Off-screen guidance','Camera is a visual layer']),
 dict(kind='phone',tag='04 / TRY THE DEMO',start=48,end=62,focus=60,beats=[('Demo mode accelerates a predicted pass to sixty times normal speed, with automatic pointing available.','A FULL PASS.\nSIXTY TIMES FASTER.'),('Next, listen to the app itself. This beacon is synthesized, not received from a satellite.','UP NEXT:\nHEAR THE APP.')],detail='DEMO 60x\nNO RADIO REQUIRED',steps=['Predict a real orbit','Practise the session','Listen to a synthesized tone']),
 dict(kind='listen',tag='05 / LISTEN TO THE APP',start=99,end=109,duration=10,focus=104,beats=[],detail='SIMULATED BEACON\nORIGINAL PHONE AUDIO',steps=['Watch the lock indicator','Follow the kHz readout','No radio signal is received']),
 dict(kind='phone',tag='06 / COMPLETE THE SESSION',start=110,end=116,visual_end=113.3,focus=112,beats=[('The result shows pointing accuracy and time on target. Each completed pass produces a simulated Q S L card.','FINISH THE PASS.\nKEEP THE RECORD.')],detail='SESSION RESULTS\nSIMULATED QSL',steps=['Locked time','Lock ratio','Best pointing error']),
 dict(kind='phone',tag='07 / COLLECT',start=185,end=189,focus=186.4,beats=[('Cards record the satellite and session details, and explicitly distinguish simulation from real radio reception.','A SESSION CARD.\nCLEARLY SIMULATED.')],detail='COLLECTION\nHONEST BY DESIGN',steps=['Satellite and timing','Demo clearly labelled','No claim of RF reception']),
 dict(kind='kiro',tag='08 / BUILT WITH KIRO',beats=[('Kiro development follows eleven feature specifications and two steering files, all included in the repository.','ELEVEN SPECS.\nONE CLEAR PROCESS.'),('Requirements, design, and tasks structure implementation. Steering documents define the scope and development rules.','REQUIREMENTS.\nDESIGN. TASKS.')],detail='REPOSITORY EVIDENCE\n.kiro/',steps=['Requirements','Design','Tasks']),
 dict(kind='close',tag='KIROWEEN / RESURRECTION',beats=[('Start with a forgotten spacecraft. Learn when to look and where to point. The orbit is real. The beacon is simulated.','THE ORBIT IS REAL.\nTHE BEACON\nIS SIMULATED.')],detail='zombie-satellite.vercel.app',steps=[])
]
MINT='#9fffe0';AMBER='#ffc27b';WHITE='#f0f4fa';MUTED='#9caec4';BG='#060b14'

def timing():
    cursor=0; cues=[]
    for i,s in enumerate(SCENES):
        s['out']=cursor
        if s['kind']=='listen':cursor+=s['duration'];continue
        # The result footage still contains six seconds of phone audio. Preserve
        # it and delay future narration until the entire original-sound window ends.
        if i==8:cursor+=6
        for text,headline in s['beats']:
            words=len(re.findall(r"[A-Za-z]+(?:'[A-Za-z]+)?",text))
            duration=math.ceil((words*60/130+1)*2)/2
            cues.append(dict(scene=i,start=cursor,end=cursor+duration,text=text,headline=headline,words=words))
            cursor+=duration
        s['duration']=cursor-s['out']
    assert cursor<180,cursor
    subtitle_cues=cues+[dict(start=s['out'],end=s['out']+s['duration']+6,text='[Original phone audio: synthesized beacon. No real radio reception.]') for s in SCENES if s['kind']=='listen']
    subtitle_cues.sort(key=lambda c:c['start'])
    (HERE/'cinematic.en.srt').write_text('\n\n'.join(f'{i+1}\n{base.timestamp(c["start"])} --> {base.timestamp(c["end"])}\n{c["text"]}' for i,c in enumerate(subtitle_cues))+'\n',encoding='utf-8')
    (HERE/'cinematic_tts_script.txt').write_text('\n\n'.join(c['text'] for c in cues),encoding='utf-8')
    with (HERE/'cinematic_tts_timing.csv').open('w',newline='',encoding='utf-8-sig') as f:
        w=csv.writer(f);w.writerow(['start','end','type','text'])
        rows=[(c['start'],c['end'],'narration',c['text']) for c in cues]
        rows += [(s['out'],s['out']+s['duration']+6,'listen_only','LEAVE SILENT: original synthesized app audio, including result-screen tail') for s in SCENES if s['kind']=='listen']
        w.writerows(sorted(rows))
    (HERE/'cinematic_timeline.json').write_text(json.dumps(dict(duration=cursor,scenes=SCENES),indent=2),encoding='utf-8')
    return cues,cursor

def txt(d,xy,t,size,color=WHITE,bold=False):
    d.multiline_text(xy,t,font=base.font(size,bold),fill=color,spacing=9)

def artwork(w,h):
    # Original diagrammatic space art: star field, atmospheric limb, orbital paths.
    a=np.zeros((h,w,3),dtype=np.uint8); yy,xx=np.ogrid[:h,:w]
    glow=np.exp(-(((xx-w*.78)/(w*.55))**2+((yy-h*.48)/(h*.6))**2)*3)
    for k,v in enumerate((11,29,40)):a[:,:,k]=np.uint8(4+glow*v)
    im=Image.fromarray(a);d=ImageDraw.Draw(im);rng=np.random.default_rng(81)
    for _ in range(420):
        x=int(rng.uniform(0,w));y=int(rng.uniform(0,h));v=int(rng.uniform(25,145));r=int(rng.choice([1,1,1,2]))
        d.ellipse((x-r,y-r,x+r,y+r),fill=(v,v,min(255,v+25)))
    cx=int(w*.65);cy=int(h*1.5);r=int(h*.8)
    for q in range(40,0,-1):d.ellipse((cx-r-q,cy-r-q,cx+r+q,cy+r+q),outline=(8,20+int((40-q)*1.2),35+int((40-q)*1.7)),width=2)
    d.ellipse((cx-r,cy-r,cx+r,cy+r),fill='#050a12',outline='#69aab5',width=2)
    d.arc((int(w*.25),int(h*.1),int(w*1.1),int(h*1.05)),185,340,fill='#426e79',width=2)
    # Abstract spacecraft diagram (not an engineering model).
    sx=int(w*.76);sy=int(h*.38)
    d.polygon([(sx-24,sy),(sx,sy-23),(sx+24,sy),(sx,sy+23)],fill='#bdd8dc')
    d.polygon([(sx-30,sy-6),(sx-105,sy-38),(sx-120,sy-6),(sx-44,sy+24)],fill='#183445',outline='#7cbdc5')
    d.polygon([(sx+30,sy+6),(sx+105,sy+38),(sx+120,sy+6),(sx+44,sy-24)],fill='#183445',outline='#7cbdc5')
    for radius in (90,145,210):d.arc((sx-radius,sy-radius,sx+radius,sy+radius),-55,55,fill='#254f5d',width=2)
    return im

def prep():
    previous.private_frames()
    for i,s in enumerate(SCENES):
        if 'focus' in s:
            base.run(['-ss',str(s['focus']),'-i',str(base.ROOT/'docs/ScreenRecording.mp4'),'-frames:v','1',str(WORK/f'focus-{i}.png')],WORK/f'focus-{i}.log')

def panel(i,s,vertical):
    w,h=(1080,1920) if vertical else (1920,1080)
    im=artwork(w,h);d=ImageDraw.Draw(im)
    story=s['kind'] in ('story','close')
    if not story:
        d.rectangle((0,0,w,h),fill=BG)
        for x in range(0,w,80):d.line((x,0,x,h),fill='#0d1824')
        for y in range(0,h,80):d.line((0,y,w,y),fill='#0d1824')
    txt(d,(42,30) if vertical else (55,32),'zombieSatellite',27,MINT,True)
    txt(d,(42,79) if vertical else (55,90),s['tag'],22,AMBER,True)
    if story:
        if 'year' in s:txt(d,(42,190) if vertical else (55,175),s['year'],170 if vertical else 190,'#193f4a',True)
        txt(d,(42,1430) if vertical else (55,785),s['detail'],26,MINT,True)
        if s['kind']=='story':
            txt(d,(42,1510) if vertical else (55,845),'Historical event / Source: NASA\nRediscovery credited to Scott Tilley',22,MUTED)
        else:txt(d,(42,1510) if vertical else (55,845),'FIND A PASS. POINT YOUR PHONE. FOLLOW THE ORBIT.',22,MUTED)
    elif vertical:
        if s['kind']!='kiro':d.rounded_rectangle((175,290,905,1623),24,fill='#10202e',outline='#325b68',width=2)
        else:
            txt(d,(65,450),'.kiro/',70,MINT,True)
            for j,(a,b) in enumerate([('01 / REQUIREMENTS','Define the feature'),('02 / DESIGN','Make the approach explicit'),('03 / TASKS','Implement in steps'),('STEERING','Scope + workflow')]):
                y=650+j*190;d.rounded_rectangle((60,y,1020,y+155),18,fill='#112331',outline='#294556',width=2)
                txt(d,(90,y+20),a,32,MINT,True);txt(d,(90,y+75),b,30)
        txt(d,(42,1640),s['detail'].replace('\n','  /  '),24,MINT,True)
    else:
        # A central phone plus a magnified detail rail uses the previous empty middle.
        if s['kind']!='kiro':d.rounded_rectangle((739,28,1267,981),22,fill='#10202e',outline='#426677',width=2)
        if 'focus' in s:
            src=Image.open(WORK/f'focus-{i}.png')
            if s['kind']=='listen':box=(40,850,1130,1900)
            elif i==3:box=(20,1150,1150,2150)
            elif i==5:box=(0,150,1170,1250)
            elif i==6:box=(0,850,1170,1900)
            elif i==8:box=(30,450,1140,1500)
            else:box=(25,700,1140,1750)
            detail=src.crop(box);detail.thumbnail((520,440));im.paste(detail,(1320,210));d=ImageDraw.Draw(im)
        elif s['kind']=='private':
            src=Image.open(WORK/'private-1.png');detail=src.crop((55,1200,1120,1830)).resize((520,308));im.paste(detail,(1320,245));d=ImageDraw.Draw(im)
        txt(d,(1320,135),'IN FOCUS',22,AMBER,True)
        txt(d,(1320,695),s['detail'],29,MINT,True)
        for j,item in enumerate(s.get('steps',[])):
            y=650+j*89;d.rounded_rectangle((55,y,680,y+68),10,fill='#102332',outline='#254451')
            txt(d,(78,y+17),f'0{j+1}  '+item,26,MUTED)
        if s['kind']=='kiro':
            for j,(name,note) in enumerate([('REQUIREMENTS','What must work'),('DESIGN','How it fits together'),('TASKS','Implement and verify')]):
                y=200+j*210;d.rounded_rectangle((770,y,1830,y+165),20,fill='#132736',outline='#35586a',width=2)
                txt(d,(810,y+25),name,44,MINT,True);txt(d,(810,y+90),note,28)
            txt(d,(810,870),'.kiro/specs     +     .kiro/steering',28,AMBER,True)
    bottom=1705 if vertical else 984
    d.rectangle((0,bottom,w,h),fill='#03070d');d.rectangle((0,bottom-3,int(w*(i+1)/len(SCENES)),bottom),fill=MINT)
    name=WORK/f'{"p" if vertical else "l"}-panel-{i}.png';im.save(name);return name

def write_wav(path,a,sr=48000):
    with wave.open(str(path),'wb') as f:f.setnchannels(2);f.setsampwidth(2);f.setframerate(sr);f.writeframes((np.clip(a,-1,1)*32767).astype('<i2').tobytes())

def audio(total):
    sr=48000;n=int(sr*total);source=np.zeros((n,2),np.float32)
    raw=WORK/'original.wav';base.run(['-i',str(base.ROOT/'docs/ScreenRecording.mp4'),'-vn','-ar',str(sr),'-ac','2',str(raw)],WORK/'extract-audio.log')
    with wave.open(str(raw),'rb') as f:a=np.frombuffer(f.readframes(f.getnframes()),'<i2').reshape(-1,2).astype(np.float32)/32768
    for s in SCENES:
        if 'start' not in s:continue
        length=min(s['end']-s['start'],s['duration']);b=int(s['out']*sr);c=int(length*sr)
        clip=a[int(s['start']*sr):int(s['start']*sr)+c].copy()
        ramp=min(480,len(clip)//2);clip[:ramp]*=np.linspace(0,1,ramp)[:,None];clip[-ramp:]*=np.linspace(1,0,ramp)[:,None]
        source[b:b+len(clip)]=clip*.85
    # Find actual app-audio windows at 20 ms resolution; bridge small gaps.
    hop=960;level=np.array([np.sqrt(np.mean(source[k:k+hop]**2)) for k in range(0,n,hop)])
    active=level>10**(-48/20);idx=np.flatnonzero(active);intervals=[]
    for k in idx:
        t=k*hop/sr
        if intervals and t-intervals[-1][1]<.3:intervals[-1][1]=min(total,t+hop/sr)
        else:intervals.append([t,min(total,t+hop/sr)])
    gate=np.ones(n,np.float32)
    for start,end in intervals:
        # Fully silent music during the source sound; 250 ms pre-roll and 500 ms recovery.
        b=int(start*sr);e=int(end*sr);pre=max(0,b-12000);post=min(n,e+24000)
        gate[pre:b]=np.minimum(gate[pre:b],np.linspace(1,0,b-pre));gate[b:e]=0
        gate[e:post]=np.minimum(gate[e:post],np.linspace(0,1,post-e))
    # New original cinematic pulse score: dark suspended chords, a muted heartbeat,
    # distant struck-metal tones and rising textures. No previous cue reused.
    music=np.zeros((n,2),np.float32);rng=np.random.default_rng(72)
    def tone(start,length,midi,amp,style,pan=.5):
        b=int(start*sr);count=min(n-b,int(length*sr))
        if count<=0:return
        t=np.arange(count,dtype=np.float32)/sr;f=440*2**((midi-69)/12)
        if style=='pad':
            signal=(np.sin(2*np.pi*f*t)+.25*np.sin(2*np.pi*(f*1.003)*t)+.1*np.sin(2*np.pi*f*2*t))
            env=np.minimum(t/1.5,1)*np.minimum((length-t)/2,1)
        elif style=='bell':signal=np.sin(2*np.pi*f*t+1.1*np.sin(2*np.pi*f*1.414*t)*np.exp(-t));env=(1-np.exp(-t*40))*np.exp(-t/1.2)
        else:signal=np.sin(2*np.pi*(42*t+2.5*(1-np.exp(-t*15))));env=(1-np.exp(-t*100))*np.exp(-t*8)
        z=signal*env*amp;music[b:b+count,0]+=z*math.sqrt(1-pan);music[b:b+count,1]+=z*math.sqrt(pan)
    chords=[(38,45,52),(34,41,48),(41,48,55),(36,43,50)]
    for bar,t in enumerate(np.arange(0,total,8)):
        for j,m in enumerate(chords[bar%4]):tone(float(t),10,m,.038,'pad',.25+j*.25)
        tone(float(t+1),4,chords[bar%4][2]+24,.027,'bell',.25)
        tone(float(t+5),4,chords[bar%4][1]+24,.022,'bell',.75)
    for t in np.arange(1,total-3,1.6):tone(float(t),.65,35,.025,'pulse')
    for s in SCENES:
        if s['out']<1:continue
        b=max(0,int((s['out']-.65)*sr));count=min(int(.65*sr),n-b)
        noise=rng.normal(0,.005,count).astype(np.float32)*np.linspace(0,1,count)**2
        music[b:b+count]+=noise[:,None]
    fade=np.minimum(np.arange(n)/sr/2,1)*np.minimum((n-np.arange(n))/sr/3,1)
    music*=fade[:,None];music*=.095/max(.001,np.max(np.abs(music)))
    write_wav(HERE/'cinematic_music_full.wav',music)
    gated=music*gate[:,None];write_wav(HERE/'cinematic_music_ducked.wav',gated)
    write_wav(HERE/'cinematic_phone_audio.wav',source)
    write_wav(WORK/'mix.wav',gated+source)
    (HERE/'cinematic_audio_windows.json').write_text(json.dumps({'threshold_dbfs':-48,'music_zero_windows':intervals,'max_music_during_app_audio':float(np.max(np.abs(gated[gate==0]))) if np.any(gate==0) else 0},indent=2),encoding='utf-8')
    return intervals,level

def ass_file(vertical,cues,intervals,levels,total):
    w,h=(1080,1920) if vertical else (1920,1080);name=f'cinematic_{"portrait" if vertical else "landscape"}.ass'
    header=f'''[Script Info]
ScriptType: v4.00+
PlayResX: {w}
PlayResY: {h}
WrapStyle: 2
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Segoe UI,36,&H00FAF4F0,&H00FFFFFF,&H000D0703,&H000D0703,0,0,0,0,100,100,0,0,1,1,0,2,45,45,28,1
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
'''
    rows=[]
    def emit(a,b,t,layer=1):rows.append(f'Dialogue: {layer},{base.timestamp(a,True)},{base.timestamp(b,True)},Default,,0,0,0,,{t}')
    def headline(a,b,text,story=False):
        x,y=(42,520) if vertical and story else ((42,137) if vertical else ((55,390) if story else (55,260)))
        size=90 if story else (48 if vertical else 65)
        content=text.replace('\n',r'\N')
        tags=rf'{{\an7\b1\fs{size}\bord0\move({x+75},{y},{x},{y},0,360)\fad(180,160)\fscx106\fscy106\t(0,360,\fscx100\fscy100)}}'
        emit(a,b,tags+content)
        # Bright rule flashes in with every new explanation beat.
        emit(a,min(b,a+.65),rf'{{\an7\pos({x},{y-20})\p1\bord0\c&H7BC2FF&\fad(0,450)}}m 0 0 l {520 if not vertical else 800} 0 l {520 if not vertical else 800} 5 l 0 5',2)
    for c in cues:
        s=SCENES[c['scene']];headline(c['start'],c['end'],c['headline'],s['kind'] in ('story','close'))
        size=38 if vertical else 34;wrap=previous.wrap(c['text'],size,w-120).replace('\n',r'\N')
        emit(c['start'],c['end'],rf'{{\fs{size}\fad(100,100)}}'+wrap,3)
    for s in SCENES:
        if s['kind']=='listen':
            a=s['out'];b=a+s['duration'];headline(a,a+5,'LISTEN.\nTHIS IS THE APP.');headline(a+5,b,'HEAR THE TONE.\nWATCH THE SHIFT.')
            emit(a,b,r'{\c&H7BC2FF&\b1\fad(150,150)}'+(r'Original phone audio. Synthesized beacon.\NNo satellite radio signal is received.' if vertical else 'Original phone audio. Synthesized beacon. No satellite radio signal is received.'),3)
    result=SCENES[8]
    headline(result['out'],result['out']+6,'PASS COMPLETE.\nKEEP LISTENING.')
    emit(result['out'],result['out']+6,r'{\c&H7BC2FF&\b1\fad(150,150)}Original phone audio / synthesized beacon',3)
    for a,b in intervals:
        x,y=(205,1528) if vertical else (1310,805)
        emit(a,b,rf'{{\an7\pos({x},{y})\p1\bord0\c&H203848&\fad(80,160)}}m 0 0 l {670 if vertical else 540} 0 l {670 if vertical else 540} 95 l 0 95',4)
        emit(a,b,rf'{{\an7\pos({x+18},{y+12})\fs{29 if vertical else 26}\b1\c&H7BC2FF&\bord0\fad(80,160)}}APP AUDIO ON / MUSIC OFF',5)
        for t in np.arange(a,b,.15):
            idx=min(len(levels)-1,int(t/.02));v=min(1,float(levels[idx])*14)
            points=[]
            for j in range(24):
                ht=8+int(24*v*(.4+.6*abs(math.sin(j*1.9+t*7))))
                bx=j*19;points.append(f'm {bx} 30 l {bx} {30-ht} l {bx+11} {30-ht} l {bx+11} 30')
            emit(float(t),min(float(t+.15),b),rf'{{\an7\pos({x+18},{y+49})\p1\bord0\c&H7BC2FF&}}'+' '.join(points),5)
    (HERE/name).write_text(header+'\n'.join(rows),encoding='utf-8');return name

def render(vertical,cues,intervals,levels,total,rebuild=None):
    label='portrait' if vertical else 'landscape';pw,ph,x,y=(714,1306,183,300) if vertical else (512,936,747,36)
    w,h=(1080,1920) if vertical else (1920,1080)
    for i,s in enumerate(SCENES):
        if rebuild is not None and i not in rebuild:continue
        png=panel(i,s,vertical);dur=s['duration'];args=['-loop','1','-framerate','30','-i',str(png)]
        if s['kind']=='private':
            half=dur/2
            args+=['-loop','1','-framerate','30','-t',str(half),'-i',str(WORK/'private-0.png'),'-loop','1','-framerate','30','-t',str(half),'-i',str(WORK/'private-1.png')]
            fc=f'[1:v][2:v]concat=n=2:v=1:a=0,crop=1170:2140:0:130,scale={pw}:{ph},setsar=1[phone];[0:v][phone]overlay={x}:{y}:shortest=1[v]'
        elif 'start' in s:
            length=s.get('visual_end',s['end'])-s['start'];args+=['-ss',str(s['start']),'-t',str(length),'-i',str(base.ROOT/'docs/ScreenRecording.mp4')]
            fc=f'[1:v]crop=1170:2140:0:130,scale={pw}:{ph},setsar=1,fps=30,setpts=PTS-STARTPTS,tpad=stop_mode=clone:stop_duration={max(0,dur-length)}[phone];[0:v][phone]overlay={x}:{y}:shortest=1[v]'
            if not vertical:
                if s['kind']=='listen':box=(40,850,1130,1900)
                elif i==3:box=(20,1150,1150,2150)
                elif i==5:box=(0,150,1170,1250)
                elif i==6:box=(0,850,1170,1900)
                elif i==8:box=(30,450,1140,1500)
                else:box=(25,700,1140,1750)
                bx,by,br,bb=box
                fc=f'[1:v]fps=30,setpts=PTS-STARTPTS,tpad=stop_mode=clone:stop_duration={max(0,dur-length)},split=2[full][detail];[full]crop=1170:2140:0:130,scale={pw}:{ph},setsar=1[phone];[detail]crop={br-bx}:{bb-by}:{bx}:{by},scale=520:440:force_original_aspect_ratio=decrease,setsar=1[zoom];[0:v][phone]overlay={x}:{y}:shortest=1[tmp];[tmp][zoom]overlay=1320:210:shortest=1[v]'
        else:
            fc=f'[0:v]zoompan=z=\'1.015+0.000025*on\':x=\'iw/2-iw/zoom/2\':y=\'ih/2-ih/zoom/2\':d=1:s={w}x{h}:fps=30[v]'
        args+=['-filter_complex',fc,'-map','[v]','-an','-t',str(dur),'-c:v','libx264','-crf','19','-preset','veryfast','-pix_fmt','yuv420p',str(WORK/f'{label}-{i}.mp4')]
        print(f'{label} / scene {i+1} of {len(SCENES)}',flush=True);base.run(args,WORK/f'{label}-{i}.log')
    listing=WORK/f'{label}-concat.txt';listing.write_text('\n'.join(f"file '{label}-{i}.mp4'" for i in range(len(SCENES))),encoding='utf-8')
    joined=WORK/f'{label}-joined.mp4';base.run(['-f','concat','-safe','0','-i',str(listing),'-c','copy',str(joined)],WORK/f'{label}-join.log')
    ass=ass_file(vertical,cues,intervals,levels,total)
    print(f'{label} / animated text and final mix',flush=True)
    base.run(['-i',str(joined),'-i',str(WORK/'mix.wav'),'-vf',f'ass={ass}','-c:v','libx264','-preset','fast','-crf','19','-c:a','aac','-b:a','192k','-t',str(total),'-movflags','+faststart',f'zombieSatellite_Cinematic_{label}_EN.mp4'],WORK/f'{label}-final.log')

if __name__=='__main__':
    cues,total=timing();print(f'Duration: {total}s',flush=True);prep();intervals,levels=audio(total)
    print(f'App-audio priority windows: {intervals}',flush=True)
    for vertical in (False,True):render(vertical,cues,intervals,levels,total)
    print('Cinematic editions complete.',flush=True)
