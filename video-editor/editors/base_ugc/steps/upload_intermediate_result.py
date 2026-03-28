import logging

from editors.base_ugc.context import EditingContext
from editors.base_ugc.steps.base_step import PipelineStep
from utils.media_ingest_client import get_presigned_url, get_upload_presigned_url, upload_media

logger = logging.getLogger(__name__)


class UploadIntermediateResultStep(PipelineStep):
    name = "Uploading intermediate result"

    def execute(self, ctx: EditingContext) -> None:
        media_id = upload_media(ctx.current_video_path)
        presigned_url = get_presigned_url(media_id)
        upload_url = get_upload_presigned_url(media_id)

        ctx.intermediate_media_id = media_id
        ctx.intermediate_presigned_url = presigned_url
        ctx.intermediate_upload_url = upload_url

        logger.info("Uploaded intermediate result: media_id=%s", media_id)
