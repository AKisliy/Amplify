from typing import Annotated, Union
from pydantic import Field

from models.broker_model import BrokerModel
from models.creation_args.ai_ugc import AiUgcArgs
from models.creation_args.luxury_edit import LuxuryEditArgs
from models.creation_args.base_ugc import BaseUgcArgs

CreationArgs = Annotated[
    Union[BaseUgcArgs, AiUgcArgs, LuxuryEditArgs],
    Field(discriminator="format_type"),
]


class BaseCreateVideoMessage(BrokerModel):
    video_id: str
    node_id: str
    user_id: str
    creation_args: CreationArgs
