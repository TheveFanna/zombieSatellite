"""Extract genuine submission screenshots; never synthesize or reconstruct app UI."""
from pathlib import Path
import json,subprocess,zipfile
from PIL import Image,ImageDraw,ImageFont

HERE=Path(__file__).resolve().parent
SOURCE=HERE.parent/'ScreenRecording.mp4'
SHOTS=[
 ('01-home',10.0,'Home / project introduction','Product positioning and simulated-beacon disclosure.'),
 ('02-archive',85.0,'Archive / satellite stories','Documented spacecraft history and session entry points.'),
 ('03-passes-redacted',86.5,'Passes / location hidden','Upcoming passes; observer latitude and longitude are covered.'),
 ('04-camera-ar',40.0,'AR / camera overlay','Satellite direction over the real phone camera. This is not radio reception.'),
 ('05-sky-view',60.0,'Sky view / orbit geometry','Sky geometry and off-screen direction guidance; below-horizon status is preserved.'),
 ('06-demo-doppler',104.0,'Demo / pointing and Doppler','A simulated session from the 60x demo, showing pointing lock and computed Doppler.'),
 ('07-session-result',112.0,'Result / completed demo','Completed LES-1 demo with lock statistics and the Demo (60x) label.'),
 ('08-qsl-cards',185.2,'QSL / simulated sessions','Saved cards explicitly labelled as simulated sessions, not actual RF reception.')
]

def main():
    records=[]
    manifest=HERE/'screenshots.json'
    previous={r['file']:r for r in json.loads(manifest.read_text(encoding='utf-8'))} if manifest.exists() else {}
    for name,t,title,description in SHOTS:
        filters=[]
        if 'redacted' in name:
            # Coordinates are erased before the status/browser chrome crop.
            filters.append('drawbox=x=800:y=535:w=335:h=320:color=0x192534:t=fill')
        filters.append('crop=1170:2140:0:130')
        target=HERE/(name+'.png')
        # Leave unchanged screenshots alone, including files open in image viewers.
        if not target.exists() or previous.get(target.name,{}).get('source_seconds')!=t:
            temp=HERE/(name+'.pending.png')
            subprocess.run(['ffmpeg','-y','-hide_banner','-loglevel','error','-ss',str(t),'-i',str(SOURCE),'-frames:v','1','-vf',','.join(filters),str(temp)],check=True)
            temp.replace(target)
        records.append(dict(file=target.name,source='docs/ScreenRecording.mp4',source_seconds=t,title=title,description=description,dimensions=[1170,2140],changes=['Crop phone status bar and browser toolbar']+(['Opaque mask over observer coordinates'] if 'redacted' in name else [])))
    (HERE/'screenshots.json').write_text(json.dumps(records,indent=2),encoding='utf-8')
    # Contact sheet is a navigation aid, not a fabricated app screenshot.
    sheet=Image.new('RGB',(1440,1460),'#080e18');d=ImageDraw.Draw(sheet)
    f=ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf',19)
    for i,(name,_,title,_) in enumerate(SHOTS):
        with Image.open(HERE/(name+'.png')) as source:im=source.convert('RGB')
        im.thumbnail((330,650))
        x=15+(i%4)*360;y=50+(i//4)*730
        sheet.paste(im,(x,y));d.text((x,y-33),title,font=f,fill='#a4ebd1')
    sheet.save(HERE/'overview.jpg',quality=92)
    with zipfile.ZipFile(HERE/'zombieSatellite-key-screenshots.zip','w',zipfile.ZIP_DEFLATED) as z:
        for name,*_ in SHOTS:z.write(HERE/(name+'.png'),name+'.png')
        z.write(HERE/'screenshots.json','screenshots.json')
    print(f'Exported {len(SHOTS)} genuine screenshots, overview and ZIP.')

if __name__=='__main__':main()
