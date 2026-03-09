import os
from pydantic import BaseModel, Field

class AiUgcArgs(BaseModel):
    hook_path: str = Field(alias="hook_path")
    broll_path: str = Field(alias="broll_path")
    voiceover_path: str = Field(alias="voiceover_path")
    hook_srt_path: str = Field(alias="hook_srt_path")
    voiceover_srt_path: str = Field(alias="voiceover_srt_path")
    output_path: str = Field(alias="output_path")

    def with_absolute_paths(self, base_path: str) -> 'AiUgcArgs':
        return AiUgcArgs(
            hook_path=os.path.join(base_path, self.hook_path),
            broll_path=os.path.join(base_path, self.broll_path),
            voiceover_path=os.path.join(base_path, self.voiceover_path),
            hook_srt_path=os.path.join(base_path, self.hook_srt_path),
            voiceover_srt_path=os.path.join(base_path, self.voiceover_srt_path),
            output_path=os.path.join(base_path, self.output_path)
        )
