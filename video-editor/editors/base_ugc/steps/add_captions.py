import logging

from editors.base_ugc.context import EditingContext
from editors.base_ugc.steps.base_step import PipelineStep
from captions.styles import get_style
from utils.ai_gateway_client import transcribe
from utils.ffmpeg_utils import FFmpegCommandExecutor

logger = logging.getLogger(__name__)

# libass default coordinate space: PlayResY=288.
# MarginV and MarginH are in this space; they are scaled to actual resolution at render time.
_PLAY_RES_Y = 288
_PLAY_RES_X = 162   # 288 * (1080/1920) for 9:16 video


def _position_to_margins(position_x: float, position_y: float) -> tuple[int, int, int]:
    """
    Convert normalised (0-1) position to ASS alignment + margins.

    position_x: 0.0=left  0.5=centre  1.0=right
    position_y: 0.0=top   1.0=bottom

    Returns (alignment, margin_v, margin_h) in ASS coordinate space.
    ASS alignment grid (numpad layout):
        7  8  9   <- top
        4  5  6   <- middle
        1  2  3   <- bottom
    """
    # Horizontal bucket → column (left/centre/right)
    if position_x < 0.33:
        h_align = 0   # left  → alignments 1, 4, 7
    elif position_x < 0.67:
        h_align = 1   # centre → alignments 2, 5, 8
    else:
        h_align = 2   # right  → alignments 3, 6, 9

    # Vertical bucket → row
    if position_y < 0.33:
        v_align = 2   # top    → 7/8/9
    elif position_y < 0.67:
        v_align = 1   # middle → 4/5/6
    else:
        v_align = 0   # bottom → 1/2/3

    # ASS alignment = base + h_offset
    # bottom row base=1, middle=4, top=7
    base = [1, 4, 7][v_align]
    alignment = base + h_align

    # MarginV: distance from the aligned edge (bottom or top)
    if v_align == 0:
        # bottom-anchored: distance from bottom
        margin_v = int((1.0 - position_y) * _PLAY_RES_Y)
    elif v_align == 2:
        # top-anchored: distance from top
        margin_v = int(position_y * _PLAY_RES_Y)
    else:
        # middle: MarginV isn't used by libass for centering; set to 0
        margin_v = 0

    # MarginH: horizontal inset from the edge (used for left/right alignments)
    if h_align == 0:
        margin_h = int(position_x * _PLAY_RES_X)
    elif h_align == 2:
        margin_h = int((1.0 - position_x) * _PLAY_RES_X)
    else:
        margin_h = 0

    return alignment, margin_v, margin_h


class AddCaptionsStep(PipelineStep):
    name = "Adding captions"

    def execute(self, ctx: EditingContext) -> None:
        if not ctx.intermediate_presigned_url:
            raise RuntimeError("UploadIntermediateResultStep must run before AddCaptionsStep")

        settings = ctx.args.captions_settings
        language = settings.language if settings else None

        style = get_style(settings.style_code if settings else None)
        position_x = settings.position_x if settings else 0.5
        position_y = settings.position_y if settings else 0.83

        logger.info("Using caption style %r at position (%.2f, %.2f)", style.code, position_x, position_y)

        srt_text = transcribe(ctx.intermediate_presigned_url, language)

        srt_path = ctx.workspace.get_temp_path("srt")
        with open(srt_path, "w", encoding="utf-8") as f:
            f.write(srt_text.strip() + "\n")

        logger.info("Wrote captions to %s", srt_path)
        ctx.srt_path = srt_path

        alignment, margin_v, margin_h = _position_to_margins(position_x, position_y)

        # ASS force_style reference:
        # BorderStyle=1 → outline+shadow  BorderStyle=3 → opaque box
        force_style = ",".join([
            f"FontName={style.font_name}",
            f"FontSize={style.font_size}",
            f"Bold={1 if style.bold else 0}",
            f"PrimaryColour={style.primary_color}",
            f"OutlineColour={style.outline_color}",
            f"BackColour={style.back_color}",
            f"BorderStyle={style.border_style}",
            f"Outline={style.outline}",
            f"Shadow={style.shadow}",
            f"Alignment={alignment}",
            f"MarginV={margin_v}",
            f"MarginL={margin_h}",
            f"MarginR={margin_h}",
        ])
        # ffmpeg filter chain uses comma as separator — escape commas inside the value.
        force_style_escaped = force_style.replace(",", "\\,")
        vf = f"subtitles={srt_path}:force_style={force_style_escaped}"

        output_path = ctx.workspace.get_temp_path("mp4")
        logger.info("Burning captions into %s → %s", ctx.current_video_path, output_path)
        logger.info("vf: %s", vf)

        FFmpegCommandExecutor().execute([
            "ffmpeg", "-y",
            "-i", ctx.current_video_path,
            "-vf", vf,
            output_path,
        ])

        ctx.current_video_path = output_path
