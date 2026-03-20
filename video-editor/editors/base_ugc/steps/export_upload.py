import os

from editors.base_ugc.context import EditingContext
from editors.base_ugc.steps.base_step import PipelineStep
from utils.storage.minio_client import get_s3_client, upload_from_file


class ExportAndUploadStep(PipelineStep):
    name = "Exporting"

    def execute(self, ctx: EditingContext) -> None:
        client = get_s3_client()
        bucket = os.getenv("MINIO_BUCKET", "media")
        s3_key = f"videos/{ctx.video_id}.mp4"

        upload_from_file(client, bucket, s3_key, ctx.current_video_path)

        ctx.output_path = s3_key
