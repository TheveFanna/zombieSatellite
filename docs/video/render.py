"""Rebuild the submission edit. Requires FFmpeg and Pillow; original stays untouched."""
from pathlib import Path
import json, subprocess
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
WORK = HERE / 'work'
WORK.mkdir(exist_ok=True)
FONT = Path('C:/Windows/Fonts')
def font(size, bold=False):
    return ImageFont.truetype(str(FONT / ('segoeuib.ttf' if bold else 'segoeui.ttf')), size)

# In/out are source seconds. A hold extends the last frame for reading.
SCENES = [
 dict(start=8,end=20,tag='01 / RESURRECTION',title='Old spacecraft.\nA new way in.',body='A mobile companion for amateur radio\nand satellite hobbyists.',metric='FIND  /  POINT  /  FOLLOW',note='Real orbital data. Simulated beacon.',subs=[
 'zombieSatellite brings forgotten spacecraft into a hands-on mobile experience.',
 'Find the next pass, point your phone, and follow the computed Doppler shift.']),
 dict(start=65,end=76,tag='02 / THE STORIES',title='Seven satellites.\nDocumented history.',body='Explore the people and discoveries\nbehind the zombie satellites.',metric='5 PLAYABLE  +  2 STORY-ONLY',note='Historical receptions are not app activity.',subs=[
 'The archive connects each spacecraft to its documented history.',
 'IMAGE was rediscovered in 2018 by radio amateur Scott Tilley.']),
 dict(start=30,end=42,tag='03 / POINT',title='Put the orbit\nin your view.',body='Use the phone camera as a backdrop\nfor the computed satellite direction.',metric='CAMERA + ORBIT GEOMETRY',note='This recording shows the app on a phone.',subs=[
 'The AR view places the calculated satellite direction over the phone camera.',
 'Switch satellites to explore their different positions in the sky.']),
 dict(start=48,end=62,tag='04 / ORIENTATION',title='See where\nto look.',body='Sky view, direction cues and orbit arcs\nhelp you orient the phone.',metric='AZIMUTH  /  ELEVATION  /  RANGE',note='Below-horizon objects are labelled in the app.',subs=[
 'The sky view keeps the orbit geometry visible without the camera backdrop.',
 'Direction cues help you find an object even when it is outside the view.']),
 dict(start=84,end=94,tag='05 / FIND A PASS',title='Know when\nto begin.',body='Choose a spacecraft and inspect\nits next pass over your location.',metric='PUBLIC TLE DATA + SGP4',note='Pass times are shown in UTC.',subs=[
 'Pass predictions use public orbital data and the observer location.',
 'Choose a satellite, open its session, and start the 60x demo.']),
 dict(start=94,end=100,tag='06 / PRACTISE',title='A whole pass.\nAt 60x speed.',body='Practise the session with auto-point\nbefore trying it in real time.',metric='DEMO 60x  /  AUTO-POINT',note='Accelerated simulation of a predicted pass.',subs=[
 'This is demo mode with auto-point: a predicted pass played at 60x speed.']),
 dict(start=100,end=110,tag='07 / FOLLOW',title='Watch the\nDoppler shift.',body='The displayed kHz value follows\nthe computed orbital motion.',metric='LOCK TOLERANCE  +/-10 DEGREES',note='Synthesized tone. No radio reception.',subs=[
 'Follow the pointing lock and watch the Doppler readout change through the pass.',
 'The beacon tone is simulated. The phone receives no satellite radio signal.']),
 dict(start=110,end=116,tag='08 / COMPLETE',title='Finish the pass.\nReview the result.',body='See locked time, lock ratio\nand best pointing error.',metric='SESSION COMPLETE',note='Results here come from demo mode.',subs=[
 'At the end of the pass, review the session and open your QSL collection.']),
 dict(start=185,end=189,hold=6,tag='09 / COLLECT',title='Keep a record\nof the experience.',body='QSL cards record the satellite,\ntiming and session details.',metric='SIMULATED SESSION QSL',note='Cards explicitly distinguish simulation from RF.',subs=[
 'Each completed session produces a QSL card in the amateur radio tradition.',
 'The cards are labelled as simulated sessions, not proof of real reception.']),
 dict(duration=12,tag='10 / BUILT WITH KIRO',title='Spec by spec.\nThen into code.',body='Feature requirements, design and tasks\nare kept alongside the implementation.',metric='11 SPEC FOLDERS  /  2 STEERING FILES',note='Project evidence: .kiro/specs and .kiro/steering',subs=[
 'Kiro development is documented in eleven feature specs and two steering files.',
 'The specs cover orbit prediction, pointing, sessions, QSL cards and the app shell.']),
 dict(duration=8,tag='KIROWEEN 2026 / RESURRECTION',title='The orbit is real.\nThe beacon\nis simulated.',body='Try a pass on your phone.\nBring your own radio for real listening.',metric='zombie-satellite.vercel.app',note='zombieSatellite',subs=[
 'Try zombieSatellite: find a pass, point your phone, and follow the orbit.'])
]

BG='#080e19'; WHITE='#edf3f3'; MUTED='#a1b1c4'; MINT='#a4ebd1'
def lines(draw, xy, text, size, fill=WHITE, bold=False, spacing=12):
    draw.multiline_text(xy,text,font=font(size,bold),fill=fill,spacing=spacing)

def panel(i,s):
    im=Image.new('RGB',(1920,1080),BG); d=ImageDraw.Draw(im)
    # Restrained orbital grid, matching the app's night-sky palette.
    for r in (210,330,470,650):
        d.ellipse((1450-r,470-r,1450+r,470+r),outline='#152233',width=1)
    d.line((88,116,1000,116),fill='#293b4b',width=2)
    lines(d,(88,57),'zombieSatellite',28,bold=True)
    lines(d,(88,160),s['tag'],23,MINT,True)
    lines(d,(82,224),s['title'],70,bold=True,spacing=6)
    lines(d,(88,505),s['body'],32,MUTED,spacing=14)
    d.line((88,660,152,660),fill=MINT,width=4)
    lines(d,(88,700),s['metric'],28,MINT,True)
    lines(d,(88,775),s['note'],23,MUTED)
    lines(d,(88,891),'MOBILE DEMO  /  KIROW EEN 2026'.replace('KIROW EEN','KIROWEEN'),19,MUTED)
    if 'start' in s:
        d.rounded_rectangle((1192,43,1679,934),radius=30,fill='#121d2b',outline='#3c5464',width=2)
    elif i==9:
        lines(d,(1160,170),'.kiro/',42,MINT,True)
        lines(d,(1160,260),'specs/',32,WHITE,True)
        lines(d,(1185,320),'requirements.md\ndesign.md\ntasks.md',30,MUTED,spacing=20)
        lines(d,(1160,520),'steering/',32,WHITE,True)
        lines(d,(1185,580),'project-scope.md\nworkflow.md',30,MUTED,spacing=20)
        lines(d,(1160,760),'REQUIREMENTS > DESIGN > TASKS',20,MINT)
    else:
        d.ellipse((1210,240,1670,700),outline='#506c7a',width=2)
        d.ellipse((1300,330,1580,610),outline='#506c7a',width=2)
        d.line((1200,650,1680,290),fill=MINT,width=3)
        d.ellipse((1500,405,1520,425),fill=MINT)
        lines(d,(1210,770),'FIND. POINT. FOLLOW.',30,MINT,True)
    d.rectangle((0,956,1920,1080),fill='#050910')
    d.rectangle((0,953,int(1920*(i+1)/len(SCENES)),956),fill=MINT)
    im.save(WORK/f'panel-{i:02}.png')

def timestamp(t,ass=False):
    h=int(t//3600); m=int(t//60)%60; sec=t%60
    return f'{h}:{m:02}:{sec:05.2f}' if ass else f'{h:02}:{m:02}:{int(sec):02},{round((sec%1)*1000):03}'

def run(args, log):
    with open(log,'w',encoding='utf-8') as f:
        subprocess.run(['ffmpeg','-y','-hide_banner','-loglevel','warning']+args,cwd=HERE,stdout=f,stderr=f,check=True)

def main():
    captions=[]; cursor=0
    for i,s in enumerate(SCENES):
        panel(i,s)
        duration=s.get('duration',s.get('end',0)-s.get('start',0)+s.get('hold',0))
        for j,caption in enumerate(s['subs']):
            a=cursor+j*duration/len(s['subs']); b=cursor+(j+1)*duration/len(s['subs'])
            captions.append((a,b,caption))
        cursor+=duration
        output=f'work/scene-{i:02}.mp4'
        args=['-loop','1','-framerate','30','-i',f'work/panel-{i:02}.png']
        if 'start' in s:
            args+=['-ss',str(s['start']),'-t',str(s['end']-s['start']),'-i',str(ROOT/'docs/ScreenRecording.mp4')]
            # Crop status bar and browser toolbar; retain the app's own controls.
            fc=f'[1:v]crop=1170:2140:0:130,scale=470:860,setsar=1,fps=30,setpts=PTS-STARTPTS,tpad=stop_mode=clone:stop_duration={s.get("hold",0)}[phone];[0:v][phone]overlay=1200:58:shortest=1[v];[1:a]asetpts=PTS-STARTPTS,afade=t=in:d=0.08,afade=t=out:st={max(0,s["end"]-s["start"]-0.15)}:d=0.15,apad[a]'
            args+=['-filter_complex',fc,'-map','[v]','-map','[a]']
        else:
            args+=['-f','lavfi','-i','anullsrc=r=48000:cl=stereo','-map','0:v','-map','1:a']
        args+=['-t',str(duration),'-c:v','libx264','-preset','veryfast','-crf','19','-pix_fmt','yuv420p','-r','30','-c:a','aac','-b:a','160k','-ar','48000',output]
        print(f'Rendering {i+1}/{len(SCENES)}: {s["tag"]}',flush=True)
        run(args,WORK/f'render-{i:02}.log')
    (HERE/'zombieSatellite.en.srt').write_text('\n\n'.join(f'{i+1}\n{timestamp(a)} --> {timestamp(b)}\n{c}' for i,(a,b,c) in enumerate(captions))+'\n',encoding='utf-8')
    ass='''[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 0
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Segoe UI,34,&H00F3F3ED,&H00FFFFFF,&H00050910,&H00050910,0,0,0,0,100,100,0,0,1,1,0,2,100,100,38,1
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
'''
    ass+='\n'.join(f'Dialogue: 0,{timestamp(a,True)},{timestamp(b,True)},Default,,0,0,0,,{c}' for a,b,c in captions)
    (HERE/'zombieSatellite.en.ass').write_text(ass,encoding='utf-8')
    (WORK/'concat.txt').write_text('\n'.join(f"file 'scene-{i:02}.mp4'" for i in range(len(SCENES))),encoding='utf-8')
    run(['-f','concat','-safe','0','-i','work/concat.txt','-c','copy','work/joined.mp4'],WORK/'concat.log')
    print('Burning English captions and exporting final MP4',flush=True)
    run(['-i','work/joined.mp4','-vf','ass=zombieSatellite.en.ass','-c:v','libx264','-preset','fast','-crf','19','-pix_fmt','yuv420p','-c:a','copy','-movflags','+faststart','zombieSatellite_Kiroween_EN.mp4'],WORK/'final.log')
    (HERE/'timeline.json').write_text(json.dumps({'duration':cursor,'scenes':SCENES},indent=2),encoding='utf-8')
    print(f'Done: {cursor} seconds',flush=True)

if __name__=='__main__': main()
