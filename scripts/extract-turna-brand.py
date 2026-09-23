from pathlib import Path
from PIL import Image
from colorsys import rgb_to_hsv

source = Path('/home/ubuntu/upload/185149.png')
out_dir = Path('/home/ubuntu/Turna/apps/web/public')
out_dir.mkdir(parents=True, exist_ok=True)

image = Image.open(source).convert('RGBA')

# The supplied board places the primary wordmark in the upper-left quadrant.
wordmark = image.crop((170, 130, 980, 445))
icon = image.crop((205, 145, 430, 415))
favicon = image.crop((1170, 100, 1280, 205))

# Make the low-saturation presentation-board background transparent while
# preserving the green logo artwork. The original source remains untouched.
def remove_board_background(cropped: Image.Image) -> Image.Image:
    pixels = cropped.load()
    for y in range(cropped.height):
        for x in range(cropped.width):
            r, g, b, a = pixels[x, y]
            _, saturation, value = rgb_to_hsv(r / 255, g / 255, b / 255)
            green_dominant = g > r * 1.05 and g > b * 1.05
            if saturation < 0.18 or value > 0.96 or not green_dominant:
                pixels[x, y] = (r, g, b, 0)
    return cropped

remove_board_background(wordmark).save(out_dir / 'turna-wordmark.png', optimize=True)
remove_board_background(icon).save(out_dir / 'turna-icon.png', optimize=True)

favicon = favicon.convert('RGBA')
alpha = Image.new('L', favicon.size, 255)
favicon.putalpha(alpha)
side = max(favicon.size)
square = Image.new('RGBA', (side, side), (0, 0, 0, 0))
square.alpha_composite(favicon, ((side - favicon.width) // 2, (side - favicon.height) // 2))
square.resize((512, 512), Image.Resampling.LANCZOS).save(out_dir / 'turna-favicon.png', optimize=True)

def icon_canvas(size: int, background: tuple[int, int, int, int]) -> Image.Image:
    canvas = Image.new('RGBA', (size, size), background)
    mark = square.resize((int(size * 0.72), int(size * 0.72)), Image.Resampling.LANCZOS)
    canvas.alpha_composite(mark, ((size - mark.width) // 2, (size - mark.height) // 2))
    return canvas

icon_canvas(32, (250, 250, 248, 255)).save(out_dir / 'favicon.png', optimize=True)
icon_canvas(180, (250, 250, 248, 255)).save(out_dir / 'favicon-180.png', optimize=True)
icon_canvas(180, (250, 250, 248, 255)).save(out_dir / 'apple-touch-icon.png', optimize=True)
icon_canvas(192, (250, 250, 248, 255)).save(out_dir / 'app-icon-192.png', optimize=True)
icon_canvas(512, (250, 250, 248, 255)).save(out_dir / 'app-icon-512.png', optimize=True)
icon_canvas(1024, (250, 250, 248, 255)).save(out_dir / 'app-icon.png', optimize=True)
icon_canvas(512, (250, 250, 248, 255)).save(out_dir / 'logo.png', optimize=True)
icon_canvas(512, (10, 63, 45, 255)).save(out_dir / 'logo-dark.png', optimize=True)
icon_canvas(512, (10, 63, 45, 255)).save(out_dir / 'logo-on-dark.png', optimize=True)
icon_canvas(512, (250, 250, 248, 255)).convert('RGB').save(out_dir / 'logo.jpg', quality=95, optimize=True)
icon_canvas(512, (250, 250, 248, 255)).save(out_dir / 'logo.webp', quality=95, optimize=True)

splash = Image.new('RGBA', (1080, 1920), (250, 250, 248, 255))
splash_mark = square.resize((360, 360), Image.Resampling.LANCZOS)
splash.alpha_composite(splash_mark, ((splash.width - splash_mark.width) // 2, (splash.height - splash_mark.height) // 2))
splash.save(out_dir / 'splash.png', optimize=True)
print('created', out_dir / 'turna-wordmark.png')
print('created', out_dir / 'turna-icon.png')
print('created', out_dir / 'turna-favicon.png')
print('source size', image.size)
print('wordmark size', wordmark.size)
print('icon size', icon.size)
