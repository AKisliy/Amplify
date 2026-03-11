from . import _io_public as io
from abc import ABC, abstractmethod

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

IO = io

__all__ = [
    "io",
    "IO",
    "ComfyExtension",
]
