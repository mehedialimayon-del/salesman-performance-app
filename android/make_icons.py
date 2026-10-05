"""Generate Android launcher icons from the live FieldForce Hub an-logo.png."""
from pathlib import Path
from PIL import Image

repo = Path(__file__).resolve().parents[1]
logo = repo / 'an-logo.png'
if not logo.exists():
    raise FileNotFoundError('Current FieldForce Hub icon missing: an-logo.png')
img = Image.open(logo).convert('RGBA')
for density, size in [('mdpi', 48), ('hdpi', 72), ('xhdpi', 96), ('xxhdpi', 144), ('xxxhdpi', 192)]:
    target = repo / 'android' / 'app' / 'src' / 'main' / 'res' / ('mipmap-' + density)
    target.mkdir(parents=True, exist_ok=True)
    img.resize((size, size), Image.Resampling.LANCZOS).save(target / 'ic_launcher.png')
