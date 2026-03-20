import os
from typing import Literal

from models.broker_model import BrokerModel


class AiUgcArgs(BrokerModel):
    format_type: Literal["ai-ugc"]
    hook_path: str
    broll_path: str
    voiceover_path: str
    hook_srt_path: str
    voiceover_srt_path: str
    output_path: str

    def with_absolute_paths(self, base_path: str) -> "AiUgcArgs":
        return AiUgcArgs(
            format_type=self.format_type,
            hook_path=os.path.join(base_path, self.hook_path),
            broll_path=os.path.join(base_path, self.broll_path),
            voiceover_path=os.path.join(base_path, self.voiceover_path),
            hook_srt_path=os.path.join(base_path, self.hook_srt_path),
            voiceover_srt_path=os.path.join(base_path, self.voiceover_srt_path),
            output_path=os.path.join(base_path, self.output_path),
        )
