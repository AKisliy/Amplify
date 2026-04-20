import logging

from moviepy import TextClip, CompositeVideoClip, VideoFileClip

from editors.base_ugc.context import EditingContext
from editors.base_ugc.steps.base_step import PipelineStep
from utils.ai_gateway_client import transcribe
from moviepy.video.tools.subtitles import SubtitlesClip

logger = logging.getLogger(__name__)

DEFAULT_FONT = "Mont-Regular"

class AddCaptionsStep(PipelineStep):
    name = "Adding captions"

    def execute(self, ctx: EditingContext) -> None:
        if not ctx.intermediate_presigned_url:
            raise RuntimeError("UploadIntermediateResultStep must run before AddCaptionsStep")

        settings = ctx.args.captions_settings
        language = settings.language if settings else None
        font = settings.font if settings and settings.font else DEFAULT_FONT
        font_size = settings.font_size if settings else 50
        logger.info("Using font %r size %d", font, font_size)

        srt_text = transcribe(ctx.intermediate_presigned_url, language)

        srt_path = ctx.workspace.get_temp_path("srt")
        with open(srt_path, "w", encoding="utf-8") as f:
            f.write(srt_text.strip() + "\n")
        
        logger.info(f"Wrote captions to {srt_path}")

        ctx.srt_path = srt_path

        generator = lambda txt: TextClip(
            text=txt,
            font=DEFAULT_FONT,
            font_size=font_size,
            color='white', 
            margin=(0, 0, 0, 0),
            method="caption",
            text_align='center',
            size=(900, None), 
            interline=6,
            stroke_color='black',
            stroke_width=4
        )
        video = VideoFileClip(ctx.current_video_path)

        voiceover_subs = SubtitlesClip(srt_path, make_textclip=generator)

        captioned_video = CompositeVideoClip([video, voiceover_subs.with_position(('center', 1075))])

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

