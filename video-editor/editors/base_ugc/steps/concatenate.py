import logging

from editors.base_ugc.context import EditingContext
from editors.base_ugc.steps.base_step import PipelineStep
from utils.ffmpeg_commands import build_normalize_concat_command
from utils.ffmpeg_utils import FFmpegCommandExecutor

logger = logging.getLogger(__name__)


class ConcatenateStep(PipelineStep):
    name = "Merging clips"

    def execute(self, ctx: EditingContext) -> None:
        output_path = ctx.workspace.get_temp_path("mp4")
        logger.info(
            "Normalizing and concatenating %d clips → %s",
            len(ctx.media_urls), output_path,
        )
        FFmpegCommandExecutor().execute(
            build_normalize_concat_command(
                input_paths=ctx.media_urls,
                output_path=output_path,
                trim_decisions=ctx.args.trim_decisions,
                media_ids=ctx.args.media_files,
            )
        )
        ctx.current_video_path = output_path
