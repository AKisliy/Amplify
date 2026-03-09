import os
from pydantic import BaseModel, Field


class LuxuryEditArgs(BaseModel):
    fragments_path: list[str] = Field(alias="fragments_path")
    audio_path: str = Field(alias="audio_path")
    scene_changes: list[float] = Field(alias="scene_changes")
    caption: str = Field(alias="caption")
    original_duration: float = Field(alias="original_duration")
    output_path: str = Field(alias="output_path")

    def with_absolute_paths(self, base_path: str) -> 'LuxuryEditArgs':
        return LuxuryEditArgs(
            fragments_path=[os.path.join(base_path, p) for p in self.fragments_path],
            audio_path=os.path.join(base_path, self.audio_path),
            scene_changes=self.scene_changes,
            original_duration=self.original_duration,
            output_path=os.path.join(base_path, self.output_path),
            caption=self.caption
        )