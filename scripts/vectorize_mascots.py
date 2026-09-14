"""Convert approved mascot PNGs into transparent, path-only SVG assets."""
from pathlib import Path
import xml.etree.ElementTree as ET
import numpy as np
from PIL import Image, ImageDraw
import vtracer

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'marca' / 'variacoes'
NAMES = ['equipamento', 'problema', 'detalhes', 'nome', 'resumo', 'duvida', 'alegre', 'atento', 'perfil']


def remove_background(image):
    rgba = np.array(image.convert('RGBA'))
    if rgba[:, :, 3].min() == 0:
        return Image.fromarray(rgba)
    rgb = rgba[:, :, :3].astype(np.int16)
    # Remove only near-neutral white connected to the canvas boundary.
    # The closed dark outline protects white beard, hair, teeth and props.
    white = (rgb.min(axis=2) > 205) & ((rgb.max(axis=2) - rgb.min(axis=2)) < 24)
    mask = Image.fromarray(np.pad(white.astype(np.uint8) * 255, 1, constant_values=255)).copy()
    ImageDraw.floodfill(mask, (0, 0), 128, thresh=0)
    background = np.array(mask)[1:-1, 1:-1] == 128
    rgba[background, 3] = 0
    return Image.fromarray(rgba)


for name in NAMES:
    image = remove_background(Image.open(ASSETS / f'{name}.png'))
    # Reduce photographic raster noise while retaining the stepped pixel style.
    image = image.resize((420, 420), Image.Resampling.NEAREST)
    svg = vtracer.convert_pixels_to_svg(
        list(image.get_flattened_data()), image.size, colormode='color',
        hierarchical='stacked', mode='polygon', filter_speckle=2,
        color_precision=5, layer_difference=24, corner_threshold=45,
        length_threshold=3.5, max_iterations=10, splice_threshold=45,
        path_precision=1,
    )
    svg = svg.replace('width="420" height="420"', 'width="420" height="420" viewBox="0 0 420 420"')
    root = ET.fromstring(svg)
    assert root.findall('{http://www.w3.org/2000/svg}path'), name
    assert not root.findall('.//{http://www.w3.org/2000/svg}image'), name
    (ASSETS / f'{name}.svg').write_text(svg, encoding='utf-8')
    print(f'{name}: {len(svg.encode()) // 1024} KB; paths={len(root)}')
