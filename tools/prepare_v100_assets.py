"""Pack built-in imagegen atlases with a fixed foot anchor and visible height."""
from pathlib import Path
import json
from PIL import Image
root=Path(__file__).resolve().parent.parent
manifest=json.loads((root/'assets/manifest.json').read_text('utf8'))
expanded=json.loads((root/'assets/asset_manifest.json').read_text('utf8'))
def save(key,im,source):
    dest=root/f'assets/{key}.png';dest.parent.mkdir(parents=True,exist_ok=True);im.save(dest)
    w,h=im.size;manifest[key]={'w':w,'h':h}
    expanded['assets'][key]={'id':key,'name':key.split('/')[-1],'category':key.split('/')[0],'path':f'assets/{key}.png','w':w,'h':h,'anchor':{'x':.5,'y':.9583},'source':f'assets/source_sheets/{source}'}
for hero in ['warden','ranger','arcanist']:
    source=f'v100_{hero}.png';sheet=Image.open(root/'assets/source_sheets'/source).convert('RGBA')
    for row,direction in enumerate(['south','north','east']):
        for col in range(5):
            cell=sheet.crop((round(sheet.width*col/5),round(sheet.height*row/3),round(sheet.width*(col+1)/5),round(sheet.height*(row+1)/3)))
            bounds=cell.getchannel('A').point(lambda v:255 if v>24 else 0).getbbox();sprite=cell.crop(bounds)
            sprite=sprite.resize((round(sprite.width*88/sprite.height),88),Image.Resampling.NEAREST)
            canvas=Image.new('RGBA',(96,96));canvas.alpha_composite(sprite,((96-sprite.width)//2,4))
            save(f'player/{hero}_{direction}_{col}_v100',canvas,source)
source='v100_terrain_quiet.png';sheet=Image.open(root/'assets/source_sheets'/source).convert('RGB')
for i,theme in enumerate(['village','mine','hell','frost','marsh','road']):
    col=i%3;row=i//3;cell=sheet.crop((round(sheet.width*col/3),round(sheet.height*row/2),round(sheet.width*(col+1)/3),round(sheet.height*(row+1)/2)))
    save(f'tiles/ground_{theme}_v100',cell.resize((256,256),Image.Resampling.NEAREST),source)
source='v100_water.png';path=root/'assets/source_sheets'/source
if path.exists():save('tiles/water_marsh_v100',Image.open(path).convert('RGB').resize((128,128),Image.Resampling.NEAREST),source)
source='v100_props_clean.png';path=root/'assets/source_sheets'/source
if path.exists():
    sheet=Image.open(path).convert('RGBA')
    for i,(name,height) in enumerate([('frost_pine',120),('frost_obelisk',100),('frost_rock',48),('marsh_tree',110),('moss_arch',105),('reeds_urn',60)]):
        col=i%3;row=i//3;cell=sheet.crop((round(sheet.width*col/3),round(sheet.height*row/2),round(sheet.width*(col+1)/3),round(sheet.height*(row+1)/2)))
        cell=cell.crop(cell.getchannel('A').getbbox());cell.thumbnail((128,height),Image.Resampling.NEAREST)
        save(f'props/{name}_v100',cell,source)
expanded['_meta']['totalAssets']=len(expanded['assets'])
for cat in expanded['_meta']['categories']:expanded['_meta']['categories'][cat]=sum(a['category']==cat for a in expanded['assets'].values())
(root/'assets/manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n','utf8')
(root/'assets/asset_manifest.json').write_text(json.dumps(expanded,ensure_ascii=False,indent=2)+'\n','utf8')
print('Packed directional hero frames, opaque terrain and available props:',len(manifest),'runtime assets')
