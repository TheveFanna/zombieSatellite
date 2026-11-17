"""No-voice story cut: two-column landscape, quick intro, original rhythmic score."""
import json, math, wave
import numpy as np
from PIL import Image,ImageDraw
import render as base
import render_judges as prev
import render_cinematic as art

HERE=base.HERE;WORK=HERE/'work'/'storycut';WORK.mkdir(parents=True,exist_ok=True)
prev.WORK=WORK
SCENES=[
 dict(d=2,start=65,end=67,tag='THE LOST / 2005',beats=[('IMAGE\nGOES SILENT.','NASA loses contact.')],accent='2005'),
 dict(d=2,start=67,end=69,tag='THE FOUND / 2018',beats=[('SOMEONE\nHEARS IT.','Rediscovered by amateur Scott Tilley.')],accent='2018'),
 dict(d=2,start=69,end=71,tag='RESURRECTION',beats=[('NOT DEAD.\nNOT QUITE.','Some stories refuse to end.')],accent='NOW'),
 dict(d=6,start=10,end=16,tag='YOUR TURN / ZOMBIESATELLITE',beats=[('THE HUNT\nIS YOURS.','A phone companion for satellite hobbyists.'),('SEVEN GHOSTS.\nFIVE TO FOLLOW.','Documented stories. Playable satellite sessions.')],accent='01'),
 dict(d=6,kind='private',tag='FIND / THE NEXT ENCOUNTER',beats=[('FIND ITS\nNEXT RETURN.','Public orbital data predicts the next pass.'),('CHOOSE\nYOUR GHOST.','Open a session. Coordinates hidden for privacy.')],accent='02'),
 dict(d=8,start=30,end=38,tag='POINT / INTO THE SKY',beats=[('WHERE\nDO YOU LOOK?','The camera view overlays the calculated direction.'),('LET THE ORBIT\nGUIDE YOU.','Follow the on-screen direction cues.')],accent='03'),
 dict(d=6,start=50,end=56,tag='PRACTISE / BEFORE THE REAL PASS',beats=[('AN INVISIBLE\nPATH, REVEALED.','Sky view makes the orbital geometry visible.'),('FAST-FORWARD\nTHE ENCOUNTER.','Demo mode plays a predicted pass at 60x.')],accent='04'),
 dict(d=3,kind='warning',tag='SOUND ON / LISTEN NEXT',beats=[('LISTEN CLOSELY.\nA GHOST\'S HEARTBEAT.','Simulated beacon / original phone audio')],accent='...'),
 dict(d=10,start=99,end=109,kind='listen',tag='LISTEN / THE SIMULATED BEACON',beats=[('A PULSE.\nSTILL FIGHTING.','A synthesized echo of a zombie satellite.'),('HEAR THE TONE.\nWATCH IT SHIFT.','The kHz readout shows computed Doppler shift.')],accent='05'),
 dict(d=4,start=110,end=113,tag='COMPLETE / THE ENCOUNTER',beats=[('THE PASS ENDS.\nTHE STORY STAYS.','Review lock time and pointing accuracy.')],accent='06'),
 dict(d=5,start=185,end=189,tag='COLLECT / A SOUVENIR',beats=[('BRING BACK\nA SOUVENIR.','Your QSL card records a simulated session.')],accent='07'),
 dict(d=6,kind='kiro',tag='BUILT WITH KIRO',beats=[('BUILT TO BRING\nTHEM BACK.','11 feature specs. 2 steering files.'),('FROM SPECS\nTO EXPERIENCE.','Requirements, design and tasks live in the repo.')],accent='08'),
 dict(d=4,start=8,end=12,tag='KIROWEEN / RESURRECTION',beats=[('SOME STORIES\nSTILL ORBIT.','Real orbital data. A simulated beacon.')],accent='GO')
]
MINT='#9fffe0';AMBER='#ffc27b';WHITE='#f3f7fb';MUTED='#a5bccb'
def timeline():
    t=0;rows=[]
    for i,s in enumerate(SCENES):
        s['out']=t
        for j,(title,sub) in enumerate(s['beats']):
            rows.append(dict(start=t+j*s['d']/len(s['beats']),end=t+(j+1)*s['d']/len(s['beats']),title=title,text=sub,scene=i))
        t+=s['d']
    (HERE/'storycut_timeline.json').write_text(json.dumps(dict(duration=t,voiceover=False,scenes=SCENES),indent=2),encoding='utf-8')
    (HERE/'storycut.en.srt').write_text('\n\n'.join(f'{i+1}\n{base.timestamp(c["start"])} --> {base.timestamp(c["end"])}\n{c["title"].replace(chr(10)," ")}\n{c["text"]}' for i,c in enumerate(rows))+'\n',encoding='utf-8')
    return t,rows

def panel(i,s,v):
    w,h=(1080,1920) if v else (1920,1080)
    im=Image.new('RGB',(w,h),'#060b12')
    # Original star/planet illustration is the story panel, not a third column.
    space=art.artwork(1180,1080)
    if v:
        space=space.resize((1080,990));im.paste(space,(0,0))
    else:im.paste(space,(0,0))
    d=ImageDraw.Draw(im)
    if not v:d.line((1180,0,1180,h),fill='#29414e',width=2)
    art.txt(d,(48,30) if v else (64,38),'zombieSatellite',27,MINT,True)
    art.txt(d,(48,78) if v else (64,102),s['tag'],23,AMBER,True)
    if not v:
        art.txt(d,(59,157),s['accent'],130,'#224b58',True)
        # A mission path along the bottom turns the left panel into a story map.
        xs=[80,320,560,800,1080]
        d.line((80,902,1080,902),fill='#385966',width=2)
        active=min(4,int(i/3))
        for j,x in enumerate(xs):
            d.ellipse((x-7,895,x+7,909),fill=MINT if j<=active else '#294653')
        for x,label in zip(xs,['LOST','FOUND','FIND','LISTEN','KEEP']):art.txt(d,(x-20,930),label,19,MUTED)
        art.txt(d,(64,1023),'zombie-satellite.vercel.app' if i==12 else 'KIROWEEN 2026  /  RESURRECTION',22,MINT)
        if s.get('kind')!='kiro':d.rounded_rectangle((1268,27,1828,1043),24,fill='#132532',outline='#456674',width=2)
    else:
        if s.get('kind')!='kiro':d.rounded_rectangle((161,437,919,1817),24,fill='#132532',outline='#456674',width=2)
        art.txt(d,(48,1860),'zombie-satellite.vercel.app' if i==12 else 'KIROWEEN 2026 / RESURRECTION',23,MINT)
    if i<2:art.txt(d,(48,399) if v else (64,840),'Historical event / Source: NASA',20,MUTED)
    if s.get('kind')=='kiro':
        x,y,width=(75,590,930) if v else (1240,240,610)
        for j,(a,b) in enumerate([('REQUIREMENTS','What must work'),('DESIGN','How it fits together'),('TASKS','Build it step by step')]):
            yy=y+j*(310 if v else 210)
            d.rounded_rectangle((x,yy,x+width,yy+175),20,fill='#142a37',outline='#40626f',width=2)
            art.txt(d,(x+30,yy+25),a,38,MINT,True);art.txt(d,(x+30,yy+100),b,28)
        art.txt(d,(x,y+(1000 if v else 660)),'.kiro/specs + .kiro/steering',26,AMBER)
    p=WORK/f'{"p" if v else "l"}-panel-{i}.png';im.save(p);return p

def readwav(p):
    with wave.open(str(p),'rb') as f:return np.frombuffer(f.readframes(f.getnframes()),'<i2').reshape(-1,2).astype(np.float32)/32768

def audio(total):
    sr=48000;n=total*sr;src=np.zeros((n,2),np.float32)
    original=WORK/'original.wav';base.run(['-i',str(base.ROOT/'docs/ScreenRecording.mp4'),'-vn','-ar','48000','-ac','2',str(original)],WORK/'extract.log')
    a=readwav(original)
    for s in SCENES:
        if 'start' not in s:continue
        dur=min(s['end']-s['start'],s['d']);c=int(dur*sr);b=int(s['out']*sr);clip=a[int(s['start']*sr):int(s['start']*sr)+c].copy()
        clip[:480]*=np.linspace(0,1,480)[:,None];clip[-480:]*=np.linspace(1,0,480)[:,None];src[b:b+c]=clip
    hop=960;levels=np.array([np.sqrt(np.mean(src[k:k+hop]**2)) for k in range(0,n,hop)])
    intervals=[]
    for k in np.flatnonzero(levels>10**(-48/20)):
        t=float(k*.02)
        if intervals and t-intervals[-1][1]<.3:intervals[-1][1]=min(total,t+.02)
        else:intervals.append([t,min(total,t+.02)])
    # Normal foreground listening level, not the previous quiet background bed.
    art.write_wav(WORK/'phone-raw.wav',src)
    base.run(['-i',str(WORK/'phone-raw.wav'),'-af','loudnorm=I=-16:TP=-2:LRA=9','-ar','48000','-ac','2','-c:a','pcm_s16le',str(HERE/'storycut_phone.wav')],WORK/'phone-level.log')
    src=readwav(HERE/'storycut_phone.wav')[:n]
    music=np.zeros((n,2),np.float32);rng=np.random.default_rng(902)
    def put(start,z,pan=.5):
        b=int(start*sr);z=z[:max(0,n-b)]
        if b<0 or not len(z):return
        music[b:b+len(z),0]+=z*math.sqrt(1-pan);music[b:b+len(z),1]+=z*math.sqrt(pan)
    def note(start,midi,length,amp,bass=False):
        t=np.arange(int(length*sr),dtype=np.float32)/sr;f=440*2**((midi-69)/12)
        if bass:z=np.sin(2*np.pi*f*t)+.2*np.sin(4*np.pi*f*t)
        else:z=np.sin(2*np.pi*f*t+1.7*np.sin(4*np.pi*f*t)*np.exp(-t*6))+.16*np.sin(6*np.pi*f*t)
        env=(1-np.exp(-t*180))*np.exp(-t*(2.5 if bass else 2))
        put(start,z*env*amp,.5 if bass else float(rng.uniform(.2,.8)))
    chords=[(50,57,60,65),(46,53,57,62),(53,60,64,69),(48,55,60,64)]
    # 120 BPM: piano-like motif, moving bass and a real rhythmic build/drop/return.
    for beat,t in enumerate(np.arange(0,total,.5)):
        chord=chords[int(t//4)%4]
        energy=.4 if t<6 else (1.0 if t<29 else (.6 if t<35 else 1.15))
        note(float(t),chord[beat%4]+(12 if beat%8==7 else 0),1.7,.12*energy)
        if beat%2==0:note(float(t),chord[0]-24,.8,.22*energy,True)
        if t>=6:
            tt=np.arange(int(.38*sr),dtype=np.float32)/sr
            if beat%2==0:
                z=np.sin(2*np.pi*(48*tt+3*(1-np.exp(-tt*22))))*np.exp(-tt*16)*(1-np.exp(-tt*250));put(float(t),z*.38*energy)
            else:
                noise=rng.normal(0,1,len(tt)).astype(np.float32);noise=np.r_[0,np.diff(noise)]
                put(float(t),noise*np.exp(-tt*30)*(1-np.exp(-tt*250))*.065*energy)
            for off in (0,.25):
                ht=np.arange(int(.09*sr),dtype=np.float32)/sr;noise=rng.normal(0,1,len(ht)).astype(np.float32)
                put(float(t+off),np.r_[0,np.diff(noise)]*np.exp(-ht*65)*.022*energy,.65 if off else .35)
    # Broader harmonic arrivals create lift at the start and after the listening break.
    for t in (6,14,22,48,56):
        chord=chords[int(t//4)%4]
        for j,m in enumerate(chord):note(t,m+12,3,.095,.0)
    fade=np.minimum(np.arange(n)/sr/.3,1)*np.minimum((n-np.arange(n))/sr/2,1)
    music*=fade[:,None];music*=.8/max(.001,np.max(np.abs(music)))
    art.write_wav(WORK/'score-raw.wav',music)
    base.run(['-i',str(WORK/'score-raw.wav'),'-af','loudnorm=I=-16:TP=-2:LRA=11','-ar','48000','-ac','2','-c:a','pcm_s16le',str(HERE/'storycut_music.wav')],WORK/'music-level.log')
    music=readwav(HERE/'storycut_music.wav')[:n];gate=np.ones(n,np.float32)
    for a,b in intervals:
        lo=int(a*sr);hi=int(b*sr);pre=max(0,lo-48000);post=min(n,hi+24000)
        gate[pre:lo]=np.linspace(1,0,lo-pre)**1.5;gate[lo:hi]=0;gate[hi:post]=np.linspace(0,1,post-hi)
    gated=music*gate[:,None];art.write_wav(HERE/'storycut_music_gated.wav',gated);art.write_wav(WORK/'mix.wav',gated+src)
    (HERE/'storycut_audio.json').write_text(json.dumps(dict(music_target_lufs=-16,phone_target_lufs=-16,music_zero_windows=intervals,max_music_in_phone_windows=float(np.max(np.abs(gated[gate==0]))),mix_peak=float(np.max(np.abs(gated+src)))),indent=2),encoding='utf-8')
    return intervals,levels

def ass(v,rows,intervals,levels):
    w,h=(1080,1920) if v else (1920,1080);name=f'storycut_{"portrait" if v else "landscape"}.ass'
    header=f'''[Script Info]
ScriptType: v4.00+
PlayResX: {w}
PlayResY: {h}
WrapStyle: 2
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Segoe UI,36,&H00FBF7F3,&H00FFFFFF,&H00120B06,&H00120B06,0,0,0,0,100,100,0,0,1,0,0,7,40,40,20,1
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
'''
    events=[]
    def emit(a,b,t,layer=1):events.append(f'Dialogue: {layer},{base.timestamp(a,True)},{base.timestamp(b,True)},Default,,0,0,0,,{t}')
    for c in rows:
        x,y,size=(48,139,62) if v else (64,318,86)
        text=c['title'].replace('\n',r'\N');width=984 if v else 1040
        while max(base.font(size,True).getlength(z) for z in c['title'].split('\n'))>width:size-=2
        emit(c['start'],c['end'],rf'{{\an7\b1\fs{size}\move({x+45},{y},{x},{y},0,180)\fad(90,60)\fscx104\fscy104\t(0,180,\fscx100\fscy100)}}'+text)
        sx,sy,ss=(48,355,32) if v else (68,620,35)
        sub=prev.wrap(c['text'],ss,984 if v else 1000).replace('\n',r'\N')
        emit(c['start'],c['end'],rf'{{\pos({sx},{sy})\fs{ss}\c&HCB BCA5&\fad(120,60)}}'.replace('CB BCA5','CBBCA5')+sub)
        emit(c['start'],min(c['end'],c['start']+.35),rf'{{\pos({x},{y-16})\p1\c&H7BC2FF&\fad(0,300)}}m 0 0 l 850 0 l 850 4 l 0 4',2)
    # The warning precedes original sound, with a clear three-beat countdown.
    warn=SCENES[7]
    for j in range(3):
        emit(warn['out']+j,warn['out']+j+1,rf'{{\an7\pos({48 if v else 70},{390 if v else 732})\fs{26 if v else 46}\b1\c&H7BC2FF&\fad(40,80)}}SOUND ON  /  {3-j}',3)
    for a,b in intervals:
        x,y=(190,1682) if v else (70,728);bw=700 if v else 1000
        emit(a,b,rf'{{\pos({x},{y})\p1\c&H203448&\fad(60,120)}}m 0 0 l {bw} 0 l {bw} 116 l 0 116',3)
        emit(a,b,rf'{{\pos({x+18},{y+12})\fs{27 if v else 30}\b1\c&H7BC2FF&}}SIMULATED BEACON / MUSIC OFF',4)
        for t in np.arange(a,b,.12):
            val=min(1,float(levels[min(len(levels)-1,int(t/.02))])*12);pts=[]
            for j in range(32):
                hh=8+int(40*val*(.4+.6*abs(math.sin(j*1.4+t*8))));xx=j*(20 if v else 29)
                pts.append(f'm {xx} 45 l {xx} {45-hh} l {xx+11} {45-hh} l {xx+11} 45')
            emit(float(t),min(float(t+.12),b),rf'{{\pos({x+18},{y+56})\p1\c&H7BC2FF&}}'+' '.join(pts),4)
    (HERE/name).write_text(header+'\n'.join(events),encoding='utf-8');return name

def render(v,total,rows,intervals,levels):
    label='portrait' if v else 'landscape';pw,ph,x,y=(744,1360,168,445) if v else (548,1002,1274,34)
    for i,s in enumerate(SCENES):
        p=panel(i,s,v);args=['-loop','1','-framerate','30','-i',str(p)]
        if s.get('kind')=='private':
            args+=['-loop','1','-t','3','-i',str(WORK/'private-0.png'),'-loop','1','-t','3','-i',str(WORK/'private-1.png')]
            fc=f'[1:v]fps=30[v1];[2:v]fps=30[v2];[v1][v2]concat=n=2:v=1:a=0,crop=1170:2140:0:130,scale={pw}:{ph},setsar=1[phone];[0:v][phone]overlay={x}:{y}:shortest=1[v]'
        elif s.get('kind')=='warning':
            args+=['-loop','1','-framerate','30','-i',str(WORK/'private-1.png')]
            fc=f'[1:v]crop=1170:2140:0:130,scale={pw}:{ph},setsar=1[phone];[0:v][phone]overlay={x}:{y}[v]'
        elif 'start' in s:
            length=s['end']-s['start'];args+=['-ss',str(s['start']),'-t',str(length),'-i',str(base.ROOT/'docs/ScreenRecording.mp4')]
            fc=f'[1:v]crop=1170:2140:0:130,scale={pw}:{ph},setsar=1,fps=30,setpts=PTS-STARTPTS,tpad=stop_mode=clone:stop_duration={max(0,s["d"]-length)}[phone];[0:v][phone]overlay={x}:{y}:shortest=1[v]'
        else:fc='[0:v]null[v]'
        args+=['-filter_complex',fc,'-map','[v]','-an','-t',str(s['d']),'-r','30','-c:v','libx264','-preset','veryfast','-crf','19','-pix_fmt','yuv420p',str(WORK/f'{label}-{i}.mp4')]
        print(f'{label} {i+1}/{len(SCENES)}',flush=True);base.run(args,WORK/f'{label}-{i}.log')
    listing=WORK/f'{label}.txt';listing.write_text('\n'.join(f"file '{label}-{i}.mp4'" for i in range(len(SCENES))),encoding='utf-8')
    joined=WORK/f'{label}-joined.mp4';base.run(['-f','concat','-safe','0','-i',str(listing),'-c','copy',str(joined)],WORK/f'{label}-concat.log')
    subs=ass(v,rows,intervals,levels)
    print(f'{label} final',flush=True)
    base.run(['-i',str(joined),'-i',str(WORK/'mix.wav'),'-vf',f'ass={subs}','-t',str(total),'-c:v','libx264','-preset','fast','-crf','19','-c:a','aac','-b:a','192k','-movflags','+faststart',f'zombieSatellite_Story_{label}_EN.mp4'],WORK/f'{label}-final.log')

if __name__=='__main__':
    total,rows=timeline();print('Duration:',total,flush=True);prev.private_frames();intervals,levels=audio(total)
    for v in (False,True):render(v,total,rows,intervals,levels)
    print('Story cuts complete.',flush=True)
