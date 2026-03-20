import logging
import os

import math
from moviepy import AudioFileClip, CompositeAudioClip, VideoFileClip, concatenate_audioclips

from editors.base_ugc.context import EditingContext
from editors.base_ugc.steps.base_step import PipelineStep
from utils.storage.minio_client import get_s3_client

logger = logging.getLogger(__name__)

class AddMusicStep(PipelineStep):
    name = "Adding music"

    def execute(self, ctx: EditingContext) -> None:
        settings = ctx.args.music_settings

        if settings is None:
            logger.warning(f"No music settings provided for adding music step (video_id: {ctx.video_id})")
            return

        client = get_s3_client()
        bucket = os.getenv("S3_BUCKET", "media")

        music_local_path = ctx.workspace.get_temp_path("mp3")
        client.download_file(bucket, settings.music_id, music_local_path)

        video = VideoFileClip(ctx.current_video_path)
        music = AudioFileClip(music_local_path).with_volume_scaled(settings.volume)

        fitted = _fit_audio(music, video.duration)
        tracks = [video.audio, fitted] if video.audio else [fitted]
        mixed_audio = CompositeAudioClip(tracks)

        output_path = ctx.workspace.get_temp_path("mp4")
        final = video.with_audio(mixed_audio)
        final.write_videofile(output_path, codec="libx264", audio_codec="aac", logger=None)

        video.close()
        music.close()
        final.close()

        ctx.current_video_path = output_path


def _fit_audio(clip: AudioFileClip, duration: float) -> AudioFileClip:
    """Trim or loop an audio clip to exactly match the target duration."""
    if clip.duration >= duration:
        return clip.subclipped(0, duration)
    repeats = math.ceil(duration / clip.duration)
    return concatenate_audioclips([clip] * repeats).subclipped(0, duration)
