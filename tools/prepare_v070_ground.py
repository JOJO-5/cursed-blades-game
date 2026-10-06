"""Pack AI-generated atlas into opaque runtime textures; preserve source art."""
from pathlib import Path
import json
import shutil
from PIL import Image, ImageEnhance

root = Path(__file__).resolve().parent.parent
source = Path(r'C:\Users\JOJO\.codex\generated_images\01a1027b-6c5e-72b3-9578-385c55ae6273\exec-701a723b-15df-4caa-b9c1-e79be642c8fc.png')
archive = root / 'assets/source_sheets/v070_ground_atlas.png'
if source.exists():
    shutil.copy2(source, archive)
image = Image.open(archive).convert('RGB')
manifest_path = root / 'assets/manifest.json'
manifest = json.loads(manifest_path.read_text('utf8'))
for index, theme in enumerate(['village', 'mine', 'hell']):
    # Crop each equal panel, resize only for packing into the pixel-art runtime.
    tile = image.crop((round(index * image.width / 3), 0, round((index + 1) * image.width / 3), image.height))
    tile = tile.resize((128, 128), Image.Resampling.BOX)
    tile = ImageEnhance.Contrast(tile).enhance(.55)
    tile = ImageEnhance.Brightness(tile).enhance(.78)
    key = f'tiles/ground_{theme}_v070'
    tile.save(root / f'assets/{key}.png')
    manifest[key] = {'w': 128, 'h': 128}
manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+'\n','utf8')
print('Packed three opaque 128px ground textures.')
