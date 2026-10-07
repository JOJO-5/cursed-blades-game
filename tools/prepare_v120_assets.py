"""Package v120 imagegen landmarks, preserving generated alpha."""
from pathlib import Path
from PIL import Image
import json
root=Path(__file__).resolve().parent.parent
source=root/'assets/source_sheets/v120_landmarks_clean.png'
im=Image.open(source).convert('RGBA')
manifest=json.loads((root/'assets/manifest.json').read_text('utf8'))
expanded=json.loads((root/'assets/asset_manifest.json').read_text('utf8'))
for name,w,h,rect in [('mine_entrance',184,154,(0,0,768,512)),('forge',142,120,(768,0,1536,512)),('wind_brazier',124,102,(0,512,768,1024)),('tide_monument',94,120,(768,512,1536,1024))]:
 cell=im.crop(rect);bounds=cell.getchannel('A').point(lambda a:255 if a>12 else 0).getbbox()
 if not bounds:raise ValueError(name)
 cell=cell.crop(bounds);cell.thumbnail((w,h),Image.Resampling.NEAREST)
 key='props/'+name+'_v120';cell.save(root/('assets/'+key+'.png'));manifest[key]={'w':cell.width,'h':cell.height}
 expanded['assets'][key]={'id':key,'name':name+'_v120','category':'props','path':'assets/'+key+'.png','w':cell.width,'h':cell.height,'anchor':{'x':.5,'y':1},'source':'assets/source_sheets/v120_landmarks_clean.png'}
for name,source,w,h,category in [
 ('frost_grave_v120','assets/source_sheets/v120_frost_grave.png',42,56,'props'),
 ('frost_rock_v120','assets/props/frost_rock_v100.png',52,34,'props'),
 ('reeds_urn_v120','assets/props/reeds_urn_v100.png',46,56,'props'),
 ('ground_frost_v120','assets/source_sheets/v120_ground_frost.png',256,256,'tiles')]:
 cell=Image.open(root/source).convert('RGBA' if category=='props' else 'RGB')
 if category=='props':
  bounds=cell.getchannel('A').point(lambda a:255 if a>12 else 0).getbbox();cell=cell.crop(bounds);cell.thumbnail((w,h),Image.Resampling.NEAREST)
 else:cell=cell.resize((w,h),Image.Resampling.NEAREST)
 key=category+'/'+name;cell.save(root/('assets/'+key+'.png'));manifest[key]={'w':cell.width,'h':cell.height}
 expanded['assets'][key]={'id':key,'name':name,'category':category,'path':'assets/'+key+'.png','w':cell.width,'h':cell.height,'anchor':{'x':.5,'y':1 if category=='props' else .5},'source':source}
expanded['_meta']['totalAssets']=len(expanded['assets'])
for category in expanded['_meta']['categories']:expanded['_meta']['categories'][category]=sum(a['category']==category for a in expanded['assets'].values())
for name,data in [('manifest.json',manifest),('asset_manifest.json',expanded)]: (root/'assets'/name).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n','utf8')
print('Packaged four landmarks: '+str(len(manifest))+' runtime assets')
