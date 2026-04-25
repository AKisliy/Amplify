"""
Generates a small PNG preview image for a CaptionStyle using Pillow.

The preview shows the word "Amplify" rendered with approximate styling
(color, weight, outline) on a dark background — suitable for the UI card grid.
Output: 400x80 px, returned as a base64-encoded PNG string.
"""
import base64
import io
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

from captions.styles import CaptionStyle

_FONTS_DIR = Path(__file__).parent.parent / "fonts"
_PREVIEW_W = 400
_PREVIEW_H = 80
_PREVIEW_TEXT = "Amplify"
_BG_COLOR = (18, 18, 18)


def _load_font(style: CaptionStyle, target_px: int) -> ImageFont.FreeTypeFont:
    """Load the style's font at the given pixel size, falling back to default."""
    ttf_path = _FONTS_DIR / f"{style.font_name}.ttf"
    if not ttf_path.exists():
        ttf_path = _FONTS_DIR / "Mont-Regular.ttf"
    try:
        return ImageFont.truetype(str(ttf_path), size=target_px)
    except OSError:
        return ImageFont.load_default()


def _ass_color_to_rgb(ass_color: str) -> tuple[int, int, int]:
    """
    Convert ASS color &HAABBGGRR to (R, G, B).
    Ignores the alpha channel — previews are always opaque.
    """
    hex_str = ass_color.lstrip("&H")
    if len(hex_str) < 8:
        hex_str = hex_str.zfill(8)
    # AABBGGRR
    bb = int(hex_str[2:4], 16)
    gg = int(hex_str[4:6], 16)
    rr = int(hex_str[6:8], 16)
    return (rr, gg, bb)


def generate_preview_base64(style: CaptionStyle) -> str:
    """Return a base64-encoded PNG preview image for the given CaptionStyle."""
    # Scale font: ASS PlayResY=288 maps to 1920px; preview height is 80px.
    # font_size_px = style.font_size * (preview_H / 288) — but that's ~4px, too small.
    # Instead pick a fixed readable size and scale outline proportionally.
    font_px = 32
    outline_px = max(1, round(style.outline * (font_px / 48)))

    img = Image.new("RGB", (_PREVIEW_W, _PREVIEW_H), _BG_COLOR)
    draw = ImageDraw.Draw(img)

    font = _load_font(style, font_px)

    fill_color = _ass_color_to_rgb(style.primary_color)
    outline_color = _ass_color_to_rgb(style.outline_color)

    # Center text
    bbox = draw.textbbox((0, 0), _PREVIEW_TEXT, font=font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]
    x = (_PREVIEW_W - text_w) // 2
    y = (_PREVIEW_H - text_h) // 2

    # Draw outline by stroking in outline_color
    if outline_px > 0 and style.border_style != 3:
        draw.text((x, y), _PREVIEW_TEXT, font=font, fill=outline_color,
                  stroke_width=outline_px, stroke_fill=outline_color)

    # Draw box background for border_style=3
    if style.border_style == 3:
        pad = 6
        draw.rectangle(
            [x - pad, y - pad, x + text_w + pad, y + text_h + pad],
            fill=(0, 0, 0, 160),
        )

    draw.text((x, y), _PREVIEW_TEXT, font=font, fill=fill_color,
              stroke_width=outline_px if style.border_style != 3 else 0,
              stroke_fill=outline_color)

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("ascii")
