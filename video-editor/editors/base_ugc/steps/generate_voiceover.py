import logging
import os
import subprocess

from moviepy import AudioFileClip, VideoFileClip
import requests

from editors.base_ugc.context import EditingContext
from editors.base_ugc.steps.base_step import PipelineStep
from utils.ai_gateway_client import changeVoice
from utils.media_ingest_client import get_upload_presigned_url

logger = logging.getLogger(__name__)


class GenerateVoiceoverStep(PipelineStep):
    name = "Generating voiceover"

    def execute(self, ctx: EditingContext) -> None:
        if not ctx.intermediate_presigned_url or not ctx.intermediate_upload_url:
            raise RuntimeError("UploadIntermediateResultStep must run before GenerateVoiceoverStep")

        if not ctx.args.voiceover_settings:
            logger.warning("Skipping %s since no voiceover settings provided (video_id: %s)", self.name, ctx.video_id)
            return

        voice_id = ctx.args.voiceover_settings.voice_id

        # 1. Send current video to ai-gateway — get back presigned URL of the new audio
        audio_presigned_url = changeVoice(ctx.intermediate_presigned_url, voice_id)

        voiceover_audio = AudioFileClip(audio_presigned_url)
        video = VideoFileClip(ctx.current_video_path)
        video_with_replaced_audio = video.without_audio()
        video_with_replaced_audio = video_with_replaced_audio.with_audio(voiceover_audio)

        output_path = ctx.workspace.get_temp_path("mp4")

        video_with_replaced_audio.write_videofile(
            output_path,
            codec="libx264",
            audio_codec="aac",
            logger=None,
            temp_audiofile_path=ctx.workspace.base_path,
        )
        video_with_replaced_audio.close()
        voiceover_audio.close()
        video.close()

        # 3. Overwrite the intermediate file in S3
        file_size = os.path.getsize(output_path)
        with open(output_path, "rb") as f:
            put_response = requests.put(
                ctx.intermediate_upload_url,
                data=f,
                headers={"Content-Type": "video/mp4", "Content-Length": str(file_size)},
                timeout=300,
            )
        put_response.raise_for_status()

        # 4. Refresh the upload URL (presigned PUT URLs are single-use in some S3 implementations)
        ctx.intermediate_upload_url = get_upload_presigned_url(ctx.intermediate_media_id)
        ctx.current_video_path = output_path

        logger.info("Voiceover applied, intermediate updated: media_id=%s", ctx.intermediate_media_id)
