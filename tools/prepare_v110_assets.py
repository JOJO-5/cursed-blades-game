"""Pack the generated prop atlas; preserve the imagegen alpha unchanged."""
from pathlib import Path
import json
from PIL import Image

root = Path(__file__).resolve().parent.parent
source = 'v110_props_clean.png'
sheet = Image.open(root / 'assets/source_sheets' / source).convert('RGBA')
manifest = json.loads((root / 'assets/manifest.json').read_text('utf8'))
expanded = json.loads((root / 'assets/asset_manifest.json').read_text('utf8'))
for name, w, h, region in [
    ('cottage',194,164,(15,10,445,425)), ('stall',174,118,(510,80,875,425)),
    ('wall',118,55,(935,195,1320,425)), ('log',136,50,(20,500,465,775)),
    ('altar',90,115,(535,435,870,780)), ('torch',38,80,(1040,430,1250,750)),
    ('grave',46,62,(95,810,340,1140)), ('barrels',76,65,(490,850,845,1130)),
    ('oak',140,190,(910,745,1310,1180)),
]:
    # Generated rows are not exact cells. Explicit source rectangles isolate
    # the complete objects without adjacent feet/branches contaminating them.
    cell = sheet.crop(region)
    bounds=cell.getchannel('A').point(lambda a:255 if a>12 else 0).getbbox()
    cell = cell.crop(bounds)  # Only the crop bounds change; alpha is preserved.
    cell.thumbnail((w,h), Image.Resampling.NEAREST)
    key = f'props/{name}_v110'
    dest = root / f'assets/{key}.png'
    cell.save(dest)
    manifest[key] = {'w': cell.width, 'h': cell.height}
    expanded['assets'][key] = {'id':key,'name':f'{name}_v110','category':'props',
        'path':f'assets/{key}.png','w':cell.width,'h':cell.height,
        'anchor':{'x':.5,'y':1},'source':f'assets/source_sheets/{source}'}
ground_source=root/'assets/source_sheets/v110_ground_village.png'
if ground_source.exists():
    ground=Image.open(ground_source).convert('RGB').resize((256,256),Image.Resampling.NEAREST)
    key='tiles/ground_village_v110';ground.save(root/f'assets/{key}.png')
    manifest[key]={'w':256,'h':256}
    expanded['assets'][key]={'id':key,'name':'ground_village_v110','category':'tiles',
        'path':f'assets/{key}.png','w':256,'h':256,'anchor':{'x':.5,'y':.5},'source':'assets/source_sheets/v110_ground_village.png'}
expanded['_meta']['totalAssets'] = len(expanded['assets'])
for cat in expanded['_meta']['categories']:
    expanded['_meta']['categories'][cat] = sum(a['category']==cat for a in expanded['assets'].values())
for path, data in [('manifest.json',manifest),('asset_manifest.json',expanded)]:
    (root/'assets'/path).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n','utf8')
print(f'Packed nine props with preserved alpha: {len(manifest)} runtime assets')
