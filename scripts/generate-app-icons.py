"""Export the existing 知 brand mark as Android launcher icon assets."""
import argparse
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

parser = argparse.ArgumentParser()
parser.add_argument('--font', default='C:/Windows/Fonts/msyhbd.ttc')
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
out = root / 'mobile/src/static/app-icons'
out.mkdir(parents=True, exist_ok=True)
master = Image.new('RGB', (1024, 1024), '#173e35')
draw = ImageDraw.Draw(master)
font = ImageFont.truetype(args.font, 590)
bounds = draw.textbbox((0, 0), '知', font=font)
origin = ((1024 - (bounds[2] - bounds[0])) / 2 - bounds[0],
          (1024 - (bounds[3] - bounds[1])) / 2 - bounds[1])
draw.text(origin, '知', font=font, fill='#fffefa')
for size in (72, 96, 144, 192, 1024):
    master.resize((size, size), Image.Resampling.LANCZOS).save(out / f'icon-{size}.png')
print('Android icon assets exported from the existing brand mark.')
