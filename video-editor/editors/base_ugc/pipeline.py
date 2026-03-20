import logging

from editors.base_ugc.context import EditingContext
from editors.base_ugc.steps.base_step import PipelineStep, ProgressCallback

logger = logging.getLogger(__name__)


class EditingPipeline:
    def __init__(self, steps: list[PipelineStep], on_step: ProgressCallback):
        self.steps = steps
        self.on_step = on_step

    def run(self, ctx: EditingContext) -> str:
        for step in self.steps:
            logger.info(f"[{ctx.video_id}] Step '{step.name}' starting")
            self.on_step(step.name, "in_progress", None)
            try:
                step.execute(ctx)
            except Exception as e:
                logger.error(f"[{ctx.video_id}] Step '{step.name}' failed: {e}")
                self.on_step(step.name, "failed", str(e))
                raise
            logger.info(f"[{ctx.video_id}] Step '{step.name}' completed")
            self.on_step(step.name, "completed", None)

        if ctx.output_path is None:
            raise RuntimeError("Pipeline completed but output_path was not set")
        return ctx.output_path
