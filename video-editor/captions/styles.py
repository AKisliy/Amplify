from dataclasses import dataclass


@dataclass(frozen=True)
class CaptionStyle:
    code: str
    name: str
    # Font
    font_name: str
    font_size: int        # in ASS coordinate space (PlayResY=288)
    bold: bool
    # Colors in ASS ABGR format (&HAABBGGRR, AA=00 is fully opaque)
    primary_color: str    # text fill color
    outline_color: str    # text outline color
    back_color: str       # background / shadow color
    # Outline / border
    outline: float        # outline thickness in ASS units
    shadow: float         # drop shadow depth
    border_style: int     # 1 = outline+shadow, 3 = opaque box background


STYLES: dict[str, CaptionStyle] = {
    "default": CaptionStyle(
        code="default",
        name="Default",
        font_name="Mont",
        font_size=72,
        bold=False,
        primary_color="&H00FFFFFF",   # white
        outline_color="&H00000000",   # black
        back_color="&H00000000",
        outline=3.0,
        shadow=0.0,
        border_style=1,
    ),
    "bold": CaptionStyle(
        code="bold",
        name="Bold",
        font_name="Mont",
        font_size=18,
        bold=True,
        primary_color="&H00FFFFFF",   # white
        outline_color="&H00000000",   # black
        back_color="&H00000000",
        outline=4.0,
        shadow=0.0,
        border_style=1,
    ),
    "minimal": CaptionStyle(
        code="minimal",
        name="Minimal",
        font_name="Mont",
        font_size=18,
        bold=False,
        primary_color="&H00FFFFFF",   # white
        outline_color="&H00000000",   # black
        back_color="&H00000000",
        outline=1.5,
        shadow=1.0,
        border_style=1,
    ),
    "yellow": CaptionStyle(
        code="yellow",
        name="Yellow",
        font_name="Mont",
        font_size=18,
        bold=True,
        primary_color="&H0000FFFF",   # yellow (ABGR: R=FF G=FF B=00)
        outline_color="&H00000000",   # black
        back_color="&H00000000",
        outline=3.0,
        shadow=0.0,
        border_style=1,
    ),
    "box": CaptionStyle(
        code="box",
        name="Box",
        font_name="Mont",
        font_size=18,
        bold=False,
        primary_color="&H00FFFFFF",   # white text
        outline_color="&H00000000",
        back_color="&HAA000000",      # semi-transparent black box (AA=2/3 transparent)
        outline=0.0,
        shadow=0.0,
        border_style=3,               # opaque box background
    ),
}

DEFAULT_STYLE_CODE = "default"


def get_style(code: str | None) -> CaptionStyle:
    """Return the style for the given code, falling back to the default style."""
    if code and code in STYLES:
        return STYLES[code]
    return STYLES[DEFAULT_STYLE_CODE]


def style_codes() -> list[str]:
    return list(STYLES.keys())
