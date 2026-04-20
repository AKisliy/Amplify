import logging

from editors.base_ugc.context import EditingContext
from editors.base_ugc.steps.base_step import PipelineStep
from utils.ai_gateway_client import transcribe
from utils.ffmpeg_utils import FFmpegCommandExecutor

logger = logging.getLogger(__name__)

DEFAULT_FONT = "Mont-Regular"
# For 1080x1920: MarginV is distance from bottom edge.
# 1920 - 1075 = 845 puts text baseline at y=1075 from top.
_MARGIN_V = 845


class AddCaptionsStep(PipelineStep):
    name = "Adding captions"

    def execute(self, ctx: EditingContext) -> None:
        if not ctx.intermediate_presigned_url:
            raise RuntimeError("UploadIntermediateResultStep must run before AddCaptionsStep")

        settings = ctx.args.captions_settings
        language = settings.language if settings else None
        # font = settings.font if settings and settings.font else DEFAULT_FONT
        font = DEFAULT_FONT
        font_size = settings.font_size if settings else 50
        logger.info("Using font %r size %d", font, font_size)

        srt_text = transcribe(ctx.intermediate_presigned_url, language)

        srt_path = ctx.workspace.get_temp_path("srt")
        with open(srt_path, "w", encoding="utf-8") as f:
            f.write(srt_text.strip() + "\n")

        logger.info("Wrote captions to %s", srt_path)
        ctx.srt_path = srt_path

        # ASS force_style reference:
        # Alignment=2  → bottom-center
        # MarginV      → px from bottom edge
        # BorderStyle=1, Outline → text outline (CapCut-style)
        force_style = (
            f"FontName={font},"
            f"FontSize={font_size},"
            f"PrimaryColour=&H00FFFFFF,"   # white
            f"OutlineColour=&H00000000,"   # black outline
            f"BorderStyle=1,"
            f"Outline=4,"
            f"Alignment=2,"
            f"MarginV={_MARGIN_V}"
        )

        output_path = ctx.workspace.get_temp_path("mp4")
        logger.info("Burning captions into %s → %s", ctx.current_video_path, output_path)

        FFmpegCommandExecutor().execute([
            "ffmpeg", "-y",
            "-i", ctx.current_video_path,
            "-vf", f"subtitles={srt_path}:force_style='{force_style}'",
            "-c:v", "libx264",
            "-c:a", "copy",
            output_path,
        ])

        ctx.current_video_path = output_path
