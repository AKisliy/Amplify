import os

from editors.base_ugc.context import EditingContext
from editors.base_ugc.steps.base_step import PipelineStep
from utils.storage.minio_client import get_s3_client


class FetchMediaStep(PipelineStep):
    name = "Fetching media"

    def execute(self, ctx: EditingContext) -> None:
        client = get_s3_client()
        bucket = os.getenv("MINIO_BUCKET", "media")

        for media_id in ctx.args.media_files:
            local_path = ctx.workspace.get_temp_path("mp4")
            client.download_file(bucket, media_id, local_path)
            ctx.local_media_paths.append(local_path)
