from typing import Any, Dict
from abc import ABC, abstractmethod


class BaseEditor(ABC):
    @abstractmethod
    def edit_video(self, args: Dict[str, Any], base_path: str) -> str:
        pass