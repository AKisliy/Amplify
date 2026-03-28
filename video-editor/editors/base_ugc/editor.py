from editors.base_editor import BaseEditor
from editors.base_ugc.context import EditingContext
from editors.base_ugc.pipeline import EditingPipeline
from editors.base_ugc.steps.base_step import PipelineStep, ProgressCallback
from editors.base_ugc.steps.fetch_media import FetchMediaStep
from editors.base_ugc.steps.concatenate import ConcatenateStep
from editors.base_ugc.steps.remove_silence import RemoveSilenceStep
from editors.base_ugc.steps.generate_voiceover import GenerateVoiceoverStep
from editors.base_ugc.steps.add_captions import AddCaptionsStep
from editors.base_ugc.steps.add_music import AddMusicStep
from editors.base_ugc.steps.export_upload import ExportAndUploadStep
from editors.base_ugc.steps.upload_intermediate_result import UploadIntermediateResultStep
from models.creation_args.base_ugc import BaseUgcArgs
from utils.editing_workspace import WorkspaceManager
import logging

logger = logging.getLogger(__name__)

class BaseUgcEditor(BaseEditor):
    def edit_video(
        self,
        args: BaseUgcArgs,
        base_path: str,
        video_id: str = "",
        progress_cb: ProgressCallback | None = None,
    ) -> str:
        workspace = WorkspaceManager().create_workspace(base_path)
        logger.info(f"Created workspace at {workspace.base_path}")

        ctx = EditingContext(video_id=video_id, args=args, workspace=workspace)
        pipeline = EditingPipeline(
            steps=self._build_steps(args),
            on_step=progress_cb or _noop_progress,
        )
        try:
            return pipeline.run(ctx)
        finally:
            workspace.cleanup()

    def _build_steps(self, args: BaseUgcArgs) -> list[PipelineStep]:
        steps: list[PipelineStep] = [FetchMediaStep(), ConcatenateStep()]
        if args.remove_silence:
            steps.append(RemoveSilenceStep())
        if args.add_music:
            steps.append(AddMusicStep())
        # TODO: refactor for different intermediate upload checking
        if args.generate_voiceover or args.add_captions:
            steps.append(UploadIntermediateResultStep())
        if args.generate_voiceover:
            steps.append(GenerateVoiceoverStep())
        if args.add_captions:
            steps.append(AddCaptionsStep())
        steps.append(ExportAndUploadStep())
        return steps


def _noop_progress(step: str, status: str, error: str | None) -> None:
    pass
