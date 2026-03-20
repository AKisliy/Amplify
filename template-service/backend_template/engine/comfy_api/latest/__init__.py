from . import _io_public as io
from comfy_api.internal import ComfyAPIBase
from abc import ABC, abstractmethod

class ComfyAPI_latest(ComfyAPIBase):
    VERSION = "latest"
    STABLE = False

    def __init__(self):
        super().__init__()

class ComfyExtension(ABC):
    async def on_load(self) -> None:
        """
        Called when an extension is loaded.
        This should be used to initialize any global resources needed by the extension.
        """

    @abstractmethod
    async def get_node_list(self) -> list[type[io.ComfyNode]]:
        """
        Returns a list of nodes that this extension provides.
        """

ComfyAPI = ComfyAPI_latest

IO = io

__all__ = [
    "ComfyAPI",
    "io",   
    "IO",
    "ComfyExtension",
]
