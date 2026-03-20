from moviepy import VideoFileClip, concatenate_videoclips

from editors.base_ugc.context import EditingContext
from editors.base_ugc.steps.base_step import PipelineStep
from utils.formatter import format_clip

TARGET_RESOLUTION = (1080, 1920)
TARGET_FPS = 30


class ConcatenateStep(PipelineStep):
    name = "Merging clips"

    def execute(self, ctx: EditingContext) -> None:
        clips = [
            format_clip(VideoFileClip(p), TARGET_RESOLUTION, TARGET_FPS)
            for p in ctx.local_media_paths
        ]

        output_path = ctx.workspace.get_temp_path("mp4")
        final = concatenate_videoclips(clips, method="compose")
        final.write_videofile(
            output_path,
            codec="libx264",
            audio_codec="aac",
            fps=TARGET_FPS,
            logger=None,
        )

        for clip in clips:
            clip.close()
        final.close()

        ctx.current_video_path = output_path
