from pathlib import Path
from PIL import Image

source = Path('/home/ubuntu/Turna/apps/web/public/turna-logo-enhanced.png')
output = Path('/home/ubuntu/Turna/apps/web/public/turna-logo-enhanced-trimmed.png')
image = Image.open(source).convert('RGBA')
alpha = image.getchannel('A')
bounds = alpha.getbbox()
if bounds is None:
    raise RuntimeError('Generated logo has no visible pixels')
image.crop(bounds).save(output, optimize=True)
print(f'cropped {source.name} {image.size} -> {output.name} {image.crop(bounds).size}')
