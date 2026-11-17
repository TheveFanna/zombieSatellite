"""Privacy-safe landscape/portrait judge demos, original score and timed TTS copy.
Run: python docs/video/render_judges.py (FFmpeg, Pillow, NumPy).
"""
import csv, json, math, re, wave
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
import render as base

HERE=base.HERE
WORK=HERE/'work'/'judges'
WORK.mkdir(parents=True,exist_ok=True)
base.WORK=WORK
SCENES=base.SCENES
COPY=[
 ['Satellite hobbyists need to know when to look, where to point, and how the radio frequency shifts.',
  'zombieSatellite brings those steps together on a phone, giving forgotten spacecraft a new role in hands-on learning.'],
 ['The archive covers seven zombie satellites, with documented stories and sources. Five support playable sessions.',
  'For example, radio amateur Scott Tilley rediscovered the IMAGE spacecraft in twenty eighteen.'],
 ['The augmented reality view places the calculated satellite direction over the phone camera.',
  'Switch spacecraft to explore their different positions. The camera is a visual backdrop, not a radio receiver.'],
 ['Without the camera, the sky view still shows orbit geometry and direction cues.',
  'These cues help you orient the phone, including when the selected satellite is outside the view.'],
 ['Public orbital data and the observer location determine the next predicted pass. Times are shown in coordinated universal time.',
  'Choose a satellite, inspect the pass, and open its session. Observer coordinates are hidden here for privacy.'],
 ['This demonstration plays a predicted pass at sixty times normal speed, with automatic pointing enabled.'],
 ['During the pass, the lock indicator shows pointing accuracy, while the Doppler readout tracks the computed frequency shift.',
  'The beacon sound is synthesized. The app receives no satellite radio signal. Real reception requires your own radio.'],
 ['At the end of the pass, review locked time, lock ratio, and pointing error, then open the card collection.'],
 ['Each completed session produces a Q S L card containing the satellite, timing, and session details.',
  'Every card identifies the session as simulated, so it cannot be mistaken for proof of radio reception.'],
 ['The project was built with Kiro, using eleven feature specifications and two steering files.',
  'Requirements, design, and tasks structure the work. Steering documents define project scope and development rules.',
  'This evidence is included in the repository, covering orbit prediction, pointing, sessions, and the app shell.'],
 ['zombieSatellite makes the first steps of satellite tracking accessible on a phone. The orbit is real. The beacon is simulated.']
]

def wrap(text,size,width):
    words=text.replace('\n',' ').split(); rows=[]; row=''
    for word in words:
        candidate=(row+' '+word).strip()
        if base.font(size).getlength(candidate)>width and row:
            rows.append(row); row=word
        else: row=candidate
    return '\n'.join(rows+[row])

def portrait_panel(i,s):
    im=Image.new('RGB',(1080,1920),base.BG); d=ImageDraw.Draw(im)
    base.lines(d,(60,35),'zombieSatellite',30,bold=True)
    base.lines(d,(60,98),s['tag'],24,base.MINT,True)
    title=s['title'].replace('\n',' ')
    base.lines(d,(55,147),wrap(title,48,970),48,bold=True,spacing=3)
    if 'start' in s:
        d.rounded_rectangle((228,314,852,1459),radius=28,fill='#121d2b',outline='#3c5464',width=2)
    elif i==9:
        base.lines(d,(110,430),'.kiro/',55,base.MINT,True)
        base.lines(d,(110,550),'specs/',43,bold=True)
        base.lines(d,(155,630),'requirements.md\ndesign.md\ntasks.md',39,base.MUTED,spacing=30)
        base.lines(d,(110,920),'steering/',43,bold=True)
        base.lines(d,(155,1000),'project-scope.md\nworkflow.md',39,base.MUTED,spacing=30)
    else:
        d.ellipse((240,500,840,1100),outline='#506c7a',width=3)
        d.ellipse((360,620,720,980),outline='#506c7a',width=2)
        d.line((240,1080,840,540),fill=base.MINT,width=4)
        base.lines(d,(240,1200),'FIND. POINT. FOLLOW.',42,base.MINT,True)
    base.lines(d,(60,1490),wrap(s['metric'],28,960),28,base.MINT,True)
    base.lines(d,(60,1580),wrap(s['note'],25,960),25,base.MUTED)
    d.rectangle((0,1680,1080,1920),fill='#050910')
    d.rectangle((0,1677,int(1080*(i+1)/11),1680),fill=base.MINT)
    im.save(WORK/f'portrait-{i:02}.png')

def narration():
    cues=[]; cursor=0
    for i,s in enumerate(SCENES):
        s['subs']=COPY[i]; s['output_start']=cursor; durations=[]
        for text in COPY[i]:
            # Count punctuation-separated spoken words; expand abbreviations in copy.
            n=len(re.findall(r"[A-Za-z]+(?:'[A-Za-z]+)?",text))
            slot=max(5,math.ceil((n*60/130+1.0)*2)/2)
            cues.append(dict(scene=i+1,start=cursor,end=cursor+slot,words=n,text=text))
            durations.append(slot); cursor+=slot
        s['output_duration']=sum(durations)
    assert cursor<180, cursor
    (HERE/'judges.en.srt').write_text('\n\n'.join(f'{i+1}\n{base.timestamp(c["start"])} --> {base.timestamp(c["end"])}\n{c["text"]}' for i,c in enumerate(cues))+'\n',encoding='utf-8')
    (HERE/'judges_tts_script.txt').write_text('\n\n'.join(c['text'] for c in cues)+'\n',encoding='utf-8')
    with (HERE/'judges_tts_timing.csv').open('w',encoding='utf-8-sig',newline='') as f:
        w=csv.writer(f); w.writerow(['scene','start_seconds','end_seconds','slot_seconds','words','text'])
        for c in cues: w.writerow([c['scene'],c['start'],c['end'],c['end']-c['start'],c['words'],c['text']])
    (HERE/'judges_timeline.json').write_text(json.dumps({'duration':cursor,'target_wpm':130,'pause_per_cue':1,'scenes':SCENES},indent=2),encoding='utf-8')
    return cues,cursor

def score(duration):
    # Original synthesized ambient cue: slow minor-seventh pads and soft arpeggios.
    sr=48000; n=int(duration*sr); music=np.zeros((n,2),dtype=np.float32)
    chords=[(45,52,55,59),(41,48,52,55),(48,55,59,62),(43,50,53,57)]
    def note(start,length,midi,level,pan):
        begin=int(start*sr); count=min(int(length*sr),n-begin)
        if count<=0:return
        t=np.arange(count,dtype=np.float32)/sr; freq=440*2**((midi-69)/12)
        env=np.minimum(t/1.2,1)*np.minimum((length-t)/1.8,1)
        tone=(np.sin(2*np.pi*freq*t)+.12*np.sin(4*np.pi*freq*t))*env*level
        music[begin:begin+count,0]+=tone*math.sqrt(1-pan)
        music[begin:begin+count,1]+=tone*math.sqrt(pan)
    for bar,start in enumerate(np.arange(0,duration,8)):
        chord=chords[bar%4]
        for j,midi in enumerate(chord):note(float(start),10,midi,.14,.2+j*.2)
        for j in range(4):note(float(start+j*2),3,chord[j]+24,.035,.25+(j%2)*.5)
    fade=np.minimum(np.arange(n)/sr/3,1)*np.minimum((n-np.arange(n))/sr/4,1)
    music*=fade[:,None]
    peak=np.max(np.abs(music)); music*=.12/max(peak,.001)
    with wave.open(str(WORK/'score.wav'),'wb') as f:
        f.setnchannels(2);f.setsampwidth(2);f.setframerate(sr);f.writeframes((music*32767).astype('<i2').tobytes())
    base.run(['-i',str(WORK/'score.wav'),'-af','loudnorm=I=-30:TP=-9:LRA=7','-ar','48000','judges_music.wav'],WORK/'music.log')

def private_frames():
    # Only approved static frames enter this scene; scrolling coordinates never enter the output.
    for j,sec in enumerate((86.5,93.2)):
        p=WORK/f'private-{j}.png'
        base.run(['-ss',str(sec),'-i',str(base.ROOT/'docs/ScreenRecording.mp4'),'-frames:v','1',str(p)],WORK/f'privacy-{j}.log')
        im=Image.open(p).convert('RGB');d=ImageDraw.Draw(im)
        boxes=([(800,535,1135,855)] if j==0 else [(790,655,1125,790),(100,900,600,1025)])
        for box in boxes:
            d.rectangle(box,fill='#192534')
            d.text((box[0]+16,box[1]+16),'HIDDEN',font=base.font(32,True),fill=base.MINT)
        im.save(p)

def captions(cues,vertical):
    width,height,size,margin=(1080,1920,40,68) if vertical else (1920,1080,34,30)
    name='judges_portrait.en.ass' if vertical else 'judges_landscape.en.ass'
    header=f'''[Script Info]
ScriptType: v4.00+
PlayResX: {width}
PlayResY: {height}
WrapStyle: 0
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Segoe UI,{size},&H00F3F3ED,&H00FFFFFF,&H00100905,&H00100905,0,0,0,0,100,100,0,0,1,1,0,2,60,60,{margin},1
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
'''
    rows=[]
    for c in cues:
        text=wrap(c['text'],size,width-140).replace('\n',r'\N')
        rows.append(f'Dialogue: 0,{base.timestamp(c["start"],True)},{base.timestamp(c["end"],True)},Default,,0,0,0,,{text}')
    (HERE/name).write_text(header+'\n'.join(rows),encoding='utf-8')
    return name

def render(vertical,cues,total):
    label='portrait' if vertical else 'landscape'
    pw,ph,x,y=(608,1112,236,330) if vertical else (470,860,1200,58)
    for i,s in enumerate(SCENES):
        duration=s['output_duration']
        if vertical:portrait_panel(i,s); panel=WORK/f'portrait-{i:02}.png'
        else:base.panel(i,s); panel=WORK/f'panel-{i:02}.png'
        args=['-loop','1','-framerate','30','-i',str(panel)]
        if i==4:
            half=duration/2
            args+=['-loop','1','-framerate','30','-t',str(half),'-i',str(WORK/'private-0.png'),'-loop','1','-framerate','30','-t',str(half),'-i',str(WORK/'private-1.png'),'-f','lavfi','-i','anullsrc=r=48000:cl=stereo']
            fc=f'[1:v][2:v]concat=n=2:v=1:a=0,crop=1170:2140:0:130,scale={pw}:{ph},setsar=1[phone];[0:v][phone]overlay={x}:{y}:shortest=1[v]'
            args+=['-filter_complex',fc,'-map','[v]','-map','3:a']
        elif 'start' in s:
            length=s['end']-s['start']; hold=max(0,duration-length)
            args+=['-ss',str(s['start']),'-t',str(length),'-i',str(base.ROOT/'docs/ScreenRecording.mp4')]
            fc=f'[1:v]crop=1170:2140:0:130,scale={pw}:{ph},setsar=1,fps=30,setpts=PTS-STARTPTS,tpad=stop_mode=clone:stop_duration={hold}[phone];[0:v][phone]overlay={x}:{y}:shortest=1[v];[1:a]asetpts=PTS-STARTPTS,volume=0.25,afade=t=in:d=0.15,afade=t=out:st={max(0,min(length,duration)-.3)}:d=0.3,apad[a]'
            args+=['-filter_complex',fc,'-map','[v]','-map','[a]']
        else:args+=['-f','lavfi','-i','anullsrc=r=48000:cl=stereo','-map','0:v','-map','1:a']
        args+=['-t',str(duration),'-c:v','libx264','-preset','veryfast','-crf','19','-pix_fmt','yuv420p','-r','30','-c:a','aac','-ar','48000','-b:a','160k',str(WORK/f'{label}-{i:02}.mp4')]
        print(f'{label}: scene {i+1}/11',flush=True);base.run(args,WORK/f'{label}-{i:02}.log')
    listing=WORK/f'{label}-concat.txt';listing.write_text('\n'.join(f"file '{label}-{i:02}.mp4'" for i in range(11)),encoding='utf-8')
    joined=WORK/f'{label}-joined.mp4'
    base.run(['-f','concat','-safe','0','-i',str(listing),'-c','copy',str(joined)],WORK/f'{label}-concat.log')
    ass=captions(cues,vertical)
    print(f'{label}: captions and music',flush=True)
    base.run(['-i',str(joined),'-i','judges_music.wav','-filter_complex',f'[0:v]ass={ass}[v];[0:a][1:a]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.8[a]','-map','[v]','-map','[a]','-t',str(total),'-c:v','libx264','-preset','fast','-crf','19','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-movflags','+faststart',f'zombieSatellite_Judges_{label}_EN.mp4'],WORK/f'{label}-final.log')

if __name__=='__main__':
    cues,total=narration();print(f'TTS timeline: {total}s',flush=True)
    private_frames();score(total)
    render(False,cues,total);render(True,cues,total)
    print('Both judge editions complete.',flush=True)
