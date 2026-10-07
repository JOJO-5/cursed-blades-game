"""Package generated combat art. Preserve source alpha; only crop and nearest resize."""
from pathlib import Path
from PIL import Image
import json
root=Path(__file__).resolve().parent.parent
m=json.loads((root/'assets/manifest.json').read_text('utf-8'));e=json.loads((root/'assets/asset_manifest.json').read_text('utf-8'))
def save(key,im,source):
 im.save(root/f'assets/{key}.png');w,h=im.size;m[key]={'w':w,'h':h};e['assets'][key]={'id':key,'name':key.split('/')[-1],'category':key.split('/')[0],'path':f'assets/{key}.png','w':w,'h':h,'anchor':{'x':.5,'y':.9583 if key.startswith('player/') else 1},'source':f'assets/source_sheets/{source}'}
for name in ['cursed_knight','brood_matriarch','infernal_dragon','frost_warden','tide_keeper']:
 source=f'v120_{name}.png';im=Image.open(root/'assets/source_sheets'/source).convert('RGBA');im=im.crop(im.getchannel('A').point(lambda a:255 if a>12 else 0).getbbox());im.thumbnail((128,128),Image.Resampling.NEAREST);save(f'bosses/{name}_v120',im,source)
for hero in ['warden','ranger','arcanist']:
 source=f'v120_walk_final_{hero}.png';sheet=Image.open(root/'assets/source_sheets'/source).convert('RGBA')
 for row,direction in enumerate(['south','east']):
  for col in range(4):
   frame_source = source
   im=sheet.crop((round(sheet.width*col/4),round(sheet.height*row/2),round(sheet.width*(col+1)/4),round(sheet.height*(row+1)/2)))
   im=im.crop(im.getchannel('A').point(lambda a:255 if a>24 else 0).getbbox());im=im.resize((round(im.width*88/im.height),88),Image.Resampling.NEAREST)
   canvas=Image.new('RGBA',(96,96));canvas.alpha_composite(im,((96-im.width)//2,4));save(f'player/{hero}_{direction}_{col+1}_v120',canvas,frame_source)
   if col==1:save(f'player/{hero}_{direction}_0_v120',canvas,frame_source)
e['_meta']['totalAssets']=len(e['assets'])
for cat in e['_meta']['categories']:e['_meta']['categories'][cat]=sum(a['category']==cat for a in e['assets'].values())
for name,data in [('manifest.json',m),('asset_manifest.json',e)]: (root/'assets'/name).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n','utf-8')
print('Combat assets:',len(m))
