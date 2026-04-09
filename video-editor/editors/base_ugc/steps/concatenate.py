import logging
import subprocess

from moviepy import VideoFileClip, concatenate_videoclips
from moviepy.config import FFMPEG_BINARY

from editors.base_ugc.context import EditingContext
from editors.base_ugc.steps.base_step import PipelineStep
from utils.formatter import format_clip

TARGET_RESOLUTION = (1080, 1920)
TARGET_FPS = 30

logger = logging.getLogger(__name__)

class ConcatenateStep(PipelineStep):
    name = "Merging clips"

    def execute(self, ctx: EditingContext) -> None:
        clips = []
        for p in ctx.media_urls:
            try:
                clips.append(format_clip(VideoFileClip(p), TARGET_RESOLUTION, TARGET_FPS))
            except Exception as e:
                logger.error("VideoFileClip failed for %s: %s", p, e)
                logger.error("FFMPEG_BINARY = %r", FFMPEG_BINARY)
                try:
                    result = subprocess.run(
                        [FFMPEG_BINARY, "-hide_banner", "-i", p],
                        capture_output=True, text=True, timeout=30
                    )
                    logger.error("ffmpeg returncode: %s", result.returncode)
                    logger.error("ffmpeg stderr:\n%s", result.stderr or "<empty>")
                    logger.error("ffmpeg stdout:\n%s", result.stdout or "<empty>")
                except Exception as ffmpeg_err:
                    logger.error("subprocess.run failed: %s", ffmpeg_err)
                raise

        output_path = ctx.workspace.get_temp_path("mp4")

        logger.info(f"Merging {len(clips)} clips into {output_path}")

        final = concatenate_videoclips(clips, method="compose")
        final.write_videofile(
            output_path,
            codec="libx264",
            audio_codec="aac",
            fps=TARGET_FPS,
            logger=None,
            temp_audiofile_path=ctx.workspace.base_path
        )

        for clip in clips:
            clip.close()
        final.close()

        ctx.current_video_path = output_path
