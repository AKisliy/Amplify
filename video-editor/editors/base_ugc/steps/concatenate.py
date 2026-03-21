import logging

from moviepy import VideoFileClip, concatenate_videoclips

from editors.base_ugc.context import EditingContext
from editors.base_ugc.steps.base_step import PipelineStep
from utils.formatter import format_clip

TARGET_RESOLUTION = (1080, 1920)
TARGET_FPS = 30

logger = logging.getLogger(__name__)

class ConcatenateStep(PipelineStep):
    name = "Merging clips"

    def execute(self, ctx: EditingContext) -> None:
        clips = [
            format_clip(VideoFileClip(p), TARGET_RESOLUTION, TARGET_FPS)
            for p in ctx.media_urls
        ]

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
