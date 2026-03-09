from abc import ABC, abstractmethod


class BaseLinkExtractor(ABC):
    @abstractmethod
    def get_direct_video_link(self, url: str) -> str:
        pass

    @abstractmethod
    def get_direct_audio_link(self, url: str) -> str:
        pass

    @abstractmethod
    def get_direct_video_with_audio_link(self, url: str) -> str:
        pass

    @abstractmethod
    def can_handle(self, url: str) -> bool:
        pass