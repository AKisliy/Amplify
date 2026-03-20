import os
from typing import Literal

from models.broker_model import BrokerModel


class LuxuryEditArgs(BrokerModel):
    format_type: Literal["luxury-edit"]
    fragments_path: list[str]
    audio_path: str
    scene_changes: list[float]
    caption: str
    original_duration: float
    output_path: str

    def with_absolute_paths(self, base_path: str) -> "LuxuryEditArgs":
        return LuxuryEditArgs(
            format_type=self.format_type,
            fragments_path=[os.path.join(base_path, p) for p in self.fragments_path],
            audio_path=os.path.join(base_path, self.audio_path),
            scene_changes=self.scene_changes,
            original_duration=self.original_duration,
            output_path=os.path.join(base_path, self.output_path),
            caption=self.caption,
        )
