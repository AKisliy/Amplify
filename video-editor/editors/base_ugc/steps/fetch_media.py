from editors.base_ugc.context import EditingContext
from editors.base_ugc.steps.base_step import PipelineStep
from utils.media_ingest_client import get_presigned_url


class FetchMediaStep(PipelineStep):
    name = "Fetching media"

    def execute(self, ctx: EditingContext) -> None:
        ctx.media_urls = [get_presigned_url(media_id) for media_id in ctx.args.media_files]
