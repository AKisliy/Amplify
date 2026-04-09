from typing_extensions import override

from comfy_api.latest import IO, ComfyExtension


class MediaInputNode(IO.ComfyNode):

    @classmethod
    def define_schema(cls):
        return IO.Schema(
            node_id="MediaInputNode",
            display_name="Media Input",
            category="amplify/media",
            description="Provides a media UUID for use in downstream nodes.",
            inputs=[
                IO.String.Input(
                    "media_uuid",
                    tooltip="UUID of a media asset from Media Ingest",
                ),
            ],
            outputs=[
                IO.String.Output(display_name="media_uuid"),
            ],
        )

    @classmethod
    async def execute(cls, media_uuid: str) -> IO.NodeOutput:
        return IO.NodeOutput(media_uuid)


class MediaInputExtension(ComfyExtension):
    @override
    async def get_node_list(self) -> list[type[IO.ComfyNode]]:
        return [MediaInputNode]


async def comfy_entrypoint() -> MediaInputExtension:
    return MediaInputExtension()
