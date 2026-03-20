from abc import ABC, abstractmethod
from typing import Callable

from editors.base_ugc.context import EditingContext
from models.messages.video_editing_step_changed import EditingStepStatus

ProgressCallback = Callable[[str, EditingStepStatus, str | None], None]


class PipelineStep(ABC):
    name: str

    @abstractmethod
    def execute(self, ctx: EditingContext) -> None: ...
