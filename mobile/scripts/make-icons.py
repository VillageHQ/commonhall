# Draws the app icons from the Commonhall mark (the floor plan with a door gap, on a 64 grid):
# python scripts/make-icons.py  (needs Pillow). Writes assets/*.png.
from pathlib import Path

from PIL import Image, ImageDraw

INK = (17, 17, 16, 255)
PAPER = (250, 250, 247, 255)
CLEAR = (0, 0, 0, 0)
# M4 8H60V56H40V48H52V16H12V48H24V56H4z
MARK = [(4, 8), (60, 8), (60, 56), (40, 56), (40, 48), (52, 48), (52, 16), (12, 16), (12, 48), (24, 48), (24, 56), (4, 56)]
ASSETS = Path(__file__).resolve().parent.parent / "assets"


def draw(size, ground, ink, share):
    image = Image.new("RGBA", (size, size), ground)
    scale = size * share / 64
    offset = (size - 64 * scale) / 2
    ImageDraw.Draw(image).polygon([(offset + x * scale, offset + y * scale) for x, y in MARK], fill=ink)
    return image


draw(1024, INK, PAPER, 0.62).save(ASSETS / "icon.png")
draw(1024, CLEAR, INK, 0.5).save(ASSETS / "android-icon-foreground.png")
Image.new("RGBA", (1024, 1024), PAPER).save(ASSETS / "android-icon-background.png")
draw(1024, CLEAR, (255, 255, 255, 255), 0.5).save(ASSETS / "android-icon-monochrome.png")
draw(1024, CLEAR, INK, 0.5).save(ASSETS / "splash-icon.png")
draw(48, INK, PAPER, 0.7).save(ASSETS / "favicon.png")
