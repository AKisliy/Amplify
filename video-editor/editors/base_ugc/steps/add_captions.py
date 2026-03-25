import logging

from moviepy import TextClip, CompositeVideoClip, VideoFileClip

from editors.base_ugc.context import EditingContext
from editors.base_ugc.steps.base_step import PipelineStep
from utils.ai_gateway_client import transcribe
from utils.media_ingest_client import get_presigned_url, upload_media
from moviepy.video.tools.subtitles import SubtitlesClip

logger = logging.getLogger(__name__)

class AddCaptionsStep(PipelineStep):
    name = "Adding captions"

    def execute(self, ctx: EditingContext) -> None:
        settings = ctx.args.captions_settings
        language = settings.language if settings else None

        # Upload the current (concatenated) video to get a presigned URL for transcription
        media_id = upload_media(ctx.current_video_path)
        presigned_url = get_presigned_url(media_id)

        srt_text = transcribe(presigned_url, language)

        srt_path = ctx.workspace.get_temp_path("srt")
        with open(srt_path, "w", encoding="utf-8") as f:
            f.write(srt_text.strip())
        
        logger.info(f"Wrote captions to {srt_path}")

        ctx.srt_path = srt_path

        generator = lambda txt: TextClip(
            text=txt,
            font='Mont-Black',
            font_size=50,
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

