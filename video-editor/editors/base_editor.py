from abc import ABC, abstractmethod

from models.messages.base_create_video_message import CreationArgs


class BaseEditor(ABC):
    @abstractmethod
    def edit_video(self, args: CreationArgs, base_path: str, **kwargs) -> str:
        pass
