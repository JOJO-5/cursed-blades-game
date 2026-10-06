"""Pack generated cart and walking frames, retaining original source sheets."""
from pathlib import Path
import json, shutil
from PIL import Image
root=Path(__file__).resolve().parent.parent
generated=Path(r'C:\Users\JOJO\.codex\generated_images\01a1027b-6c5e-72b3-9578-385c55ae6273')
sources={'v080_minecart.png':'exec-105d5776-c618-4183-80d7-862b1e6c759a.png','v080_hero_walk.png':'exec-5407e1aa-c7d2-4a9a-872c-4a65885e0b17.png'}
for name,source in sources.items():
    if (generated/source).exists(): shutil.copy2(generated/source,root/'assets/source_sheets'/name)
manifest=json.loads((root/'assets/manifest.json').read_text('utf8'))
expanded=json.loads((root/'assets/asset_manifest.json').read_text('utf8'))
def save(key,image,source,animation=None):
    image.save(root/f'assets/{key}.png')
    w,h=image.size;manifest[key]={'w':w,'h':h}
    category=key.split('/')[0]
    expanded['assets'][key]={'id':key,'name':key.split('/')[-1],'category':category,'path':f'assets/{key}.png','w':w,'h':h,'anchor':{'x':.5,'y':.5},'animation':animation,'source':f'assets/source_sheets/{source}'}
cart=Image.open(root/'assets/source_sheets/v080_minecart.png').convert('RGBA')
cart=cart.crop(cart.getbbox());cart.thumbnail((96,76),Image.Resampling.NEAREST)
canvas=Image.new('RGBA',(100,80));canvas.alpha_composite(cart,((100-cart.width)//2,80-cart.height))
save('props/minecart_v080',canvas,'v080_minecart.png')
sheet=Image.open(root/'assets/source_sheets/v080_hero_walk.png').convert('RGBA')
frames=[]
for i in range(4):
    cell=sheet.crop((round(sheet.width*i/4),0,round(sheet.width*(i+1)/4),sheet.height));frames.append(cell.crop(cell.getbbox()))
scale=min(92/max(f.width for f in frames),90/max(f.height for f in frames))
for i,frame in enumerate(frames):
    frame=frame.resize((round(frame.width*scale),round(frame.height*scale)),Image.Resampling.NEAREST)
    canvas=Image.new('RGBA',(96,94));canvas.alpha_composite(frame,((96-frame.width)//2,92-frame.height))
    save(f'player/hero_walk_v080_0{i+1}',canvas,'v080_hero_walk.png',{'frames':1,'frameW':96,'frameH':94,'fps':8,'loop':True})
expanded['_meta']['totalAssets']=len(expanded['assets'])
for category in ['props','player']:expanded['_meta']['categories'][category]=sum(a['category']==category for a in expanded['assets'].values())
(root/'assets/manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n','utf8')
(root/'assets/asset_manifest.json').write_text(json.dumps(expanded,ensure_ascii=False,indent=2)+'\n','utf8')
print('Packed a transparent minecart and four 96x94 walking frames.')
