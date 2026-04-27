import logging
import re
from pathlib import Path

from editors.base_ugc.context import EditingContext
from editors.base_ugc.steps.base_step import PipelineStep
from captions.styles import CaptionStyle, get_style
from utils.ai_gateway_client import transcribe
from utils.ffmpeg_utils import FFmpegCommandExecutor

logger = logging.getLogger(__name__)

# Real video dimensions for 9:16
_PLAY_RES_X = 1080
_PLAY_RES_Y = 1920

# Absolute path to the bundled fonts directory so libass can find Mont-Regular etc.
# Layout: video-editor/editors/base_ugc/steps/add_captions.py → up 3 levels = repo root
_FONTS_DIR = str(Path(__file__).parents[3] / "fonts")

_SRT_TIMING_RE = re.compile(
    r"(\d{2}):(\d{2}):(\d{2}),(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2}),(\d{3})"
)


def _srt_time_to_ass(h: str, m: str, s: str, ms: str) -> str:
    """Convert SRT timestamp components to ASS format (H:MM:SS.cc)."""
    cs = int(ms) // 10
    return f"{int(h)}:{int(m):02d}:{int(s):02d}.{cs:02d}"


def _position_to_alignment(position_x: float, position_y: float) -> int:
    """
    Map normalised position to ASS alignment (numpad layout):
        7  8  9   <- top
        4  5  6   <- middle
        1  2  3   <- bottom
    """
    h = 0 if position_x < 0.33 else (1 if position_x < 0.67 else 2)
    v = 2 if position_y < 0.33 else (1 if position_y < 0.67 else 0)
    return [1, 4, 7][v] + h


def srt_to_ass(srt_text: str, style: CaptionStyle, position_x: float, position_y: float) -> str:
    """
    Convert SRT text to a properly positioned ASS file.

    Uses \\an + \\pos override tags on every Dialogue line so libass
    always honours the requested position, regardless of any defaults
    injected during SRT → ASS conversion.
    """
    alignment = _position_to_alignment(position_x, position_y)
    abs_x = int(position_x * _PLAY_RES_X)
    abs_y = int(position_y * _PLAY_RES_Y)
    pos_tag = f"{{\\an{alignment}\\pos({abs_x},{abs_y})}}"

    header = "\n".join([
        "[Script Info]",
        "ScriptType: v4.00+",
        f"PlayResX: {_PLAY_RES_X}",
        f"PlayResY: {_PLAY_RES_Y}",
        "",
        "[V4+ Styles]",
        "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour,"
        " BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle,"
        " BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
        (
            f"Style: Default,{style.font_name},{style.font_size},"
            f"{style.primary_color},&H00FFFFFF,{style.outline_color},{style.back_color},"
            f"{1 if style.bold else 0},0,0,0,100,100,0,0,"
            f"{style.border_style},{style.outline:.1f},{style.shadow:.1f},"
            f"{alignment},10,10,10,1"
        ),
        "",
        "[Events]",
        "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
    ])

    dialogue_lines = []
    for block in re.split(r"\n\n+", srt_text.strip()):
        block_lines = block.strip().splitlines()
        if len(block_lines) < 3:
            continue
        timing_match = _SRT_TIMING_RE.match(block_lines[1])
        if not timing_match:
            continue
        g = timing_match.groups()
        start = _srt_time_to_ass(g[0], g[1], g[2], g[3])
        end = _srt_time_to_ass(g[4], g[5], g[6], g[7])
        text = r"\N".join(block_lines[2:])
        dialogue_lines.append(f"Dialogue: 0,{start},{end},Default,,0,0,0,,{pos_tag}{text}")

    return header + "\n" + "\n".join(dialogue_lines) + "\n"


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

        logger.info("Wrote SRT to %s", srt_path)
        ctx.srt_path = srt_path

        ass_content = srt_to_ass(srt_text, style, position_x, position_y)
        ass_path = ctx.workspace.get_temp_path("ass")
        with open(ass_path, "w", encoding="utf-8") as f:
            f.write(ass_content)

        logger.info("Wrote ASS to %s", ass_path)
        vf = f"subtitles={ass_path}:fontsdir={_FONTS_DIR}"

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
