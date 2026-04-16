import logging
import math

from moviepy import AudioFileClip, CompositeAudioClip, VideoFileClip, concatenate_audioclips

from editors.base_ugc.context import EditingContext
from editors.base_ugc.steps.base_step import PipelineStep
from utils.media_ingest_client import get_presigned_url

logger = logging.getLogger(__name__)

class AddMusicStep(PipelineStep):
    name = "Adding music"

    def execute(self, ctx: EditingContext) -> None:
        settings = ctx.args.music_settings

        if settings is None:
            logger.warning(f"No music settings provided for adding music step (video_id: {ctx.video_id})")
            return

        music_url = get_presigned_url(settings.music_id)
        video = VideoFileClip(ctx.current_video_path)
        music = AudioFileClip(music_url).with_volume_scaled(settings.volume)

        fitted = _fit_audio(music, video.duration)
        tracks = [video.audio, fitted] if video.audio else [fitted]
        mixed_audio = CompositeAudioClip(tracks)

        output_path = ctx.workspace.get_temp_path("mp4")

        final = video.with_audio(mixed_audio)
        final.write_videofile(
            output_path,
            codec="libx264",
            audio_codec="aac",
            temp_audiofile_path=ctx.workspace.get_temp_path("mp3"),
            logger=None)

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
