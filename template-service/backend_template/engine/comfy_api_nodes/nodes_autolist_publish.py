from pydantic import ConfigDict
from pydantic.alias_generators import to_camel

from comfy_api.latest import IO, ComfyExtension
from pydantic import BaseModel
from typing_extensions import override


class AutoListPublishNode(IO.ComfyNode):
    OUTPUT_NODE = True

    @classmethod
    def define_schema(cls):
        return IO.Schema(
            node_id="AutoListPublishNode",
            display_name="AutoList Publish",
            category="amplify/publish",
            description="Marks the asset for scheduled AutoList publishing. The asset is added to the AutoList when the job completes.",
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
            outputs=[
                IO.String.Output("auto_list_id", tooltip="Passthrough AutoList ID"),
            ],
        )

    @classmethod
    async def execute(cls, media_id: str, auto_list_id: str) -> IO.NodeOutput:
        return IO.NodeOutput(auto_list_id=[auto_list_id], ui={"auto_list_id": auto_list_id})

class AutoListPublishExtension(ComfyExtension):
    @override
    async def get_node_list(self) -> list[type[IO.ComfyNode]]:
        return [AutoListPublishNode]


async def comfy_entrypoint() -> AutoListPublishExtension:
    return AutoListPublishExtension()
