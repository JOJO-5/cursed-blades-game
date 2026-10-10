"""Package complete weapon sprites; keep original assets and generation sources.

Only whole-sprite alpha trimming, nearest-neighbour sizing and atlas extraction.
Native Canvas originals are exported by tools/export-native-weapon-art.js.
"""
import base64,json
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
GENERATED={'crystal_weapon':'crystal','spellbook_burning':'spellbook','wand_arcane':'wand_arcane','ballista':'ballista','fire_cannon':'fire_cannon','poison_sprayer':'poison_sprayer','spear_triple_energy':'spear','blade_dual':'blade_dual','torch_classic':'torch_classic','flamethrower_skull':'flamethrower','poison_cannon':'poison_cannon','shield_round_buckler':'buckler'}
NATIVE=['sword','shield','bow','fireball','hammer','scythe','war_hammer_double','flail','mace_fire','axe','void_blade','sword_wind','hammer_meteor','knife','soul_hunter']
# Visually reviewed complete objects in old composite files. Other pieces belong
# to adjacent weapons, not to the selected item. Original files are retained.
EXTRACTED={'torch_skull_fire':('torch_skull_fire',(0,0,47,42)),'crossbow_compact':('crossbow_compact',(0,8,62,45)),'ring_fire':('ring_fire_awakened',None)}

def main():
 manifest_path=ROOT/'assets/manifest.json';metadata_path=ROOT/'assets/asset_manifest.json'
 manifest=json.loads(manifest_path.read_text(encoding='utf8'));metadata=json.loads(metadata_path.read_text(encoding='utf8'))
 export=ROOT/'output/weapon-native-art.txt'
 if export.exists():
  response=export.read_text(encoding='utf-16')
  native=json.loads(response.split('### Result\n')[1].split('\n### Ran')[0])
  for row in native:(ROOT/f'assets/source_sheets/v251_{row["id"]}_native.png').write_bytes(base64.b64decode(row['png']))
 packaged={}
 for id in list(GENERATED)+NATIVE+list(EXTRACTED):
  if id in GENERATED:im=Image.open(ROOT/f'assets/source_sheets/v251_{GENERATED[id]}_original.png').convert('RGBA')
  elif id in NATIVE:im=Image.open(ROOT/f'assets/source_sheets/v251_{id}_native.png').convert('RGBA')
  else:
   source,box=EXTRACTED[id];im=Image.open(ROOT/f'assets/weapons/{source}.png').convert('RGBA')
   if box:im=im.crop(box)
  bounds=im.getchannel('A').point(lambda a:255 if a>=24 else 0).getbbox()
  if not bounds:raise ValueError(id+' has no complete sprite')
  im=im.crop(bounds);im.thumbnail((56,56),Image.Resampling.NEAREST)
  canvas=Image.new('RGBA',(64,64));canvas.paste(im,((64-im.width)//2,(64-im.height)//2))
  key=f'weapons/{id}_v251';canvas.save(ROOT/f'assets/{key}.png');packaged[id]=key
  manifest[key]={'w':64,'h':64}
  metadata['assets'][key]={'id':key,'name':id,'category':'weapons','path':f'assets/{key}.png','w':64,'h':64,'anchor':{'x':0.5,'y':0.5},'animation':None,'source':'Complete standalone sprite; sources and prompts in assets/source_sheets/V251_WEAPON_ART.md'}
 metadata['_meta']['totalAssets']=len(metadata['assets'])
 metadata['_meta']['categories']={cat:sum(v['category']==cat for v in metadata['assets'].values()) for cat in metadata['_meta']['categories']}
 manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf8');metadata_path.write_text(json.dumps(metadata,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
 config_path=ROOT/'js/config.js';config=config_path.read_text(encoding='utf8');marker='// v0.25 preview 2: complete equipment art (combat values remain above).'
 config=config.split(marker)[0].rstrip()+'\n\n'+marker+'\n'
 config+='CONFIG.WEAPON_ART = '+json.dumps(packaged,indent=2)+';\n'
 config+='for (const [id,icon] of Object.entries(CONFIG.WEAPON_ART)) { CONFIG.WEAPONS[id].icon=icon; CONFIG.WEAPONS[id].hudIcon=icon; }\n'
 config+='for (const choice of CONFIG.UPGRADES) if (choice.weaponId) choice.icon=CONFIG.WEAPONS[choice.weaponId].hudIcon||CONFIG.WEAPONS[choice.weaponId].icon;\n'
 config+='for (const choice of CONFIG.WEAPON_UNLOCKS) choice.icon=CONFIG.WEAPONS[choice.weaponId].hudIcon||CONFIG.WEAPONS[choice.weaponId].icon;\n'
 config+='for (const recipe of CONFIG.WEAPON_EVOLUTIONS) recipe.icon=CONFIG.WEAPONS[recipe.resultWeapon].hudIcon||CONFIG.WEAPONS[recipe.resultWeapon].icon;\n'
 config_path.write_text(config,encoding='utf8')
 print(f'Packaged {len(packaged)} complete weapon sprites: {len(GENERATED)} generated, {len(NATIVE)} native, {len(EXTRACTED)} extracted.')
if __name__=='__main__':main()
