from abc import ABC, abstractmethod


class BaseConverter(ABC):
    @abstractmethod
    def convert_media_from_path(self, media_path: str, output_path: str) -> str:
        pass