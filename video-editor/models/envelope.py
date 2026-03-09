from typing import Generic, TypeVar, Union
from pydantic import BaseModel, Field
from models.messages.base_create_video_message import BaseCreateVideoMessage
from models.messages.base_preprocess_video_message import BasePrepocessVideoMessage
from models.messages.calculate_media_duration_message import CalculateMediaDurationMessage
from models.messages.calculate_video_hash_message import CalculateVideoHashMessage
from models.messages.convert_file_to_constraints_message import ConvertFileToConstraintsMessage
from models.messages.detect_scene_changes_message import DetectSceneChangesMessage
from models.messages.extract_download_link_message import ExtractDownloadLinkMessage
from models.messages.split_video_message import SplitVideoMessage

T = TypeVar("T")

class Envelope(BaseModel, Generic[T]):
    request_id: str | None = Field(alias="requestId")
    message_id: str = Field(alias="messageId")
    correlation_id: str | None = Field(alias="correlationId")
    conversation_id: str = Field(alias="conversationId")
    source_address: str = Field(alias="sourceAddress")
    destination_address: str = Field(alias="destinationAddress")
    message_type: list[str] = Field(alias="messageType")
    sent_time: str = Field(alias="sentTime")
    responseAddress: str | None = Field(alias="responseAddress")
    message: T = Field(alias="message")
    headers: dict = Field(default_factory=dict)
    host: dict = Field(default_factory=dict)