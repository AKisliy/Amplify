from editors.base_ugc.context import EditingContext
from editors.base_ugc.steps.base_step import PipelineStep
from utils.media_ingest_client import upload_media


class ExportAndUploadStep(PipelineStep):
    name = "Exporting"

    def execute(self, ctx: EditingContext) -> None:
        media_id = upload_media(ctx.current_video_path, content_type="video/mp4")
        ctx.output_media_id = media_id
