from typing import Annotated, Union
from pydantic import BaseModel, Field

from models.creation_args.ai_ugc import AiUgcArgs
from models.creation_args.luxury_edit import LuxuryEditArgs
from models.creation_args.base_ugc import BaseUgcArgs

CreationArgs = Annotated[
    Union[BaseUgcArgs, AiUgcArgs, LuxuryEditArgs],
    Field(discriminator="format_type"),
]


class BaseCreateVideoMessage(BaseModel):
    video_id: str = Field(alias="video_id")
    node_id: str = Field(alias="node_id")
    user_id: str = Field(alias="user_id")
    creation_args: CreationArgs
