import logging
import os

from moviepy import TextClip, CompositeVideoClip, VideoFileClip

from editors.base_ugc.context import EditingContext
from editors.base_ugc.steps.base_step import PipelineStep
from utils.ai_gateway_client import transcribe
from moviepy.video.tools.subtitles import SubtitlesClip

logger = logging.getLogger(__name__)

FONTS_DIR = os.path.join(os.path.dirname(__file__), "../../../../fonts")
_FONT_FILES = {
    entry.stem: entry.path
    for entry in os.scandir(FONTS_DIR)
    if entry.name.endswith(".ttf")
}
DEFAULT_FONT = os.path.join(FONTS_DIR, "Mont-Regular.ttf")

class AddCaptionsStep(PipelineStep):
    name = "Adding captions"

    def execute(self, ctx: EditingContext) -> None:
        if not ctx.intermediate_presigned_url:
            raise RuntimeError("UploadIntermediateResultStep must run before AddCaptionsStep")

        settings = ctx.args.captions_settings
        language = settings.language if settings else None
        font_name = settings.font if settings else None
        font_size = settings.font_size if settings else 50
        font_path = _FONT_FILES.get(font_name, DEFAULT_FONT) if font_name else DEFAULT_FONT
        logger.info("Using font %r → %s", font_name, font_path)

        srt_text = transcribe(ctx.intermediate_presigned_url, language)

        srt_path = ctx.workspace.get_temp_path("srt")
        with open(srt_path, "w", encoding="utf-8") as f:
            f.write(srt_text.strip())
        
        logger.info(f"Wrote captions to {srt_path}")

        ctx.srt_path = srt_path

        generator = lambda txt: TextClip(
            text=txt,
            font="Mont-Regular.ttf",
            font_size=font_size,
            color='white', 
            margin=(50, 5, 50, 0),
            method="caption",
            text_align='center',
            size=(900, None), 
            interline=6,
            stroke_color='black',
            stroke_width=4
        )
        video = VideoFileClip(ctx.current_video_path)

        voiceover_subs = SubtitlesClip(srt_path, make_textclip=generator)

        captioned_video = CompositeVideoClip([video, voiceover_subs.with_position(('center', 800))])

        output_path = ctx.workspace.get_temp_path("mp4")
        
        logger.info(f"Adding captions to {ctx.current_video_path} into {output_path}...")

        captioned_video.write_videofile(
            output_path, 
            codec="libx264", 
            audio_codec="aac", 
            logger=None,
            temp_audiofile_path=ctx.workspace.base_path
        )

        captioned_video.close()
        video.close()

        ctx.current_video_path = output_path
        ctx.srt_path = srt_path

