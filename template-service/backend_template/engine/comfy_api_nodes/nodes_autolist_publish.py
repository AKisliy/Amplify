from pydantic import ConfigDict
from pydantic.alias_generators import to_camel

from comfy_api.latest import IO, ComfyExtension
from pydantic import BaseModel
from typing_extensions import override

from comfy_api_nodes.util.broker import publish_event

EXCHANGE_NAME = "asset-ready-for-publish"


class AssetReadyForPublish(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    media_id: str
    auto_list_id: str


class AutoListPublishNode(IO.ComfyNode):
    OUTPUT_NODE = True

    @classmethod
    def define_schema(cls):
        return IO.Schema(
            node_id="AutoListPublishNode",
            display_name="AutoList Publish",
            category="amplify/publish",
            description="Publishes the generated asset to an AutoList for scheduled social media posting.",
            inputs=[
                IO.String.Input(
                    "media_id",
                    force_input=True,
                    tooltip="Media UUID from the upstream video or image generation node",
                ),
                IO.String.Input(
                    "auto_list_id",
                    tooltip="AutoList to publish the asset into",
                    extra_dict={"widget_type": "autolist_picker"},
                ),
            ],
            outputs=[],
        )

    @classmethod
    async def execute(cls, media_id: str, auto_list_id: str) -> IO.NodeOutput:
        await publish_event(
            EXCHANGE_NAME,
            AssetReadyForPublish(media_id=media_id, auto_list_id=auto_list_id),
        )
        return IO.NodeOutput()


class AutoListPublishExtension(ComfyExtension):
    @override
    async def get_node_list(self) -> list[type[IO.ComfyNode]]:
        return [AutoListPublishNode]


async def comfy_entrypoint() -> AutoListPublishExtension:
    return AutoListPublishExtension()
