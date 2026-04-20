import logging

from editors.base_ugc.context import EditingContext
from editors.base_ugc.steps.base_step import PipelineStep
from utils.ai_gateway_client import transcribe
from utils.ffmpeg_utils import FFmpegCommandExecutor

logger = logging.getLogger(__name__)

DEFAULT_FONT = "Mont-Regular"
# ffmpeg converts SRT→ASS internally with PlayResY=288 (libass default).
# MarginV must be in that coordinate space: value * (1920/288) = actual px from bottom.
# 50 → ~333px from bottom on a 1920px video.
_MARGIN_V = 50


class AddCaptionsStep(PipelineStep):
    name = "Adding captions"

    def execute(self, ctx: EditingContext) -> None:
        if not ctx.intermediate_presigned_url:
            raise RuntimeError("UploadIntermediateResultStep must run before AddCaptionsStep")

        settings = ctx.args.captions_settings
        language = settings.language if settings else None
        font = DEFAULT_FONT
        font_size = settings.font_size if settings else 16
        logger.info("Using font %r size %d", font, font_size)

        srt_text = transcribe(ctx.intermediate_presigned_url, language)

        srt_path = ctx.workspace.get_temp_path("srt")
        with open(srt_path, "w", encoding="utf-8") as f:
            f.write(srt_text.strip() + "\n")

        logger.info("Wrote captions to %s", srt_path)
        ctx.srt_path = srt_path

        # ASS force_style reference:
        # Alignment=2    → bottom-center anchor; MarginV pushes up from bottom
        # BorderStyle=1, Outline=4 → text outline (CapCut-style)
        force_style = ",".join([
            f"FontName={font}",
            f"FontSize={font_size}",
            "PrimaryColour=&H00FFFFFF",
            "OutlineColour=&H00000000",
            "BorderStyle=1",
            # "Outline=4",
            "Alignment=2",
            f"MarginV={_MARGIN_V}",
        ])
        # ffmpeg filter chain uses comma as separator — escape commas inside the value.
        # Do NOT escape '=' — those are libass key=value separators, not ffmpeg ones.
        force_style_escaped = force_style.replace(",", "\\,")
        vf = f"subtitles={srt_path}:force_style={force_style_escaped}"

        output_path = ctx.workspace.get_temp_path("mp4")
        logger.info("Burning captions into %s → %s", ctx.current_video_path, output_path)
        logger.info("vf: %s", vf)

        # Use -vf (not filter_complex) so ffmpeg auto-maps audio through unchanged.
        FFmpegCommandExecutor().execute([
            "ffmpeg", "-y",
            "-i", ctx.current_video_path,
            "-vf", vf,
            output_path,
        ])

        ctx.current_video_path = output_path
