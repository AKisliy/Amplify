from __future__ import annotations
from collections.abc import Callable
from dataclasses import dataclass, field
from kiota_abstractions.serialization import Parsable, ParseNode, SerializationWriter
from typing import Any, Optional, TYPE_CHECKING, Union

@dataclass
class TranscribeRequest(Parsable):
    # The language property
    language: Optional[str] = None
    # The maxCharsPerSegment property
    max_chars_per_segment: Optional[int] = None
    # The maxWordsPerSegment property
    max_words_per_segment: Optional[int] = None
    # The presignedUrl property
    presigned_url: Optional[str] = None
    
    @staticmethod
    def create_from_discriminator_value(parse_node: ParseNode) -> TranscribeRequest:
        """
        Creates a new instance of the appropriate class based on discriminator value
        param parse_node: The parse node to use to read the discriminator value and create the object
        Returns: TranscribeRequest
        """
        if parse_node is None:
            raise TypeError("parse_node cannot be null.")
        return TranscribeRequest()
    
    def get_field_deserializers(self,) -> dict[str, Callable[[ParseNode], None]]:
        """
        The deserialization information for the current model
        Returns: dict[str, Callable[[ParseNode], None]]
        """
        fields: dict[str, Callable[[Any], None]] = {
            "language": lambda n : setattr(self, 'language', n.get_str_value()),
            "maxCharsPerSegment": lambda n : setattr(self, 'max_chars_per_segment', n.get_int_value()),
            "maxWordsPerSegment": lambda n : setattr(self, 'max_words_per_segment', n.get_int_value()),
            "presignedUrl": lambda n : setattr(self, 'presigned_url', n.get_str_value()),
        }
        return fields
    
    def serialize(self,writer: SerializationWriter) -> None:
        """
        Serializes information the current object
        param writer: Serialization writer to use to serialize this model
        Returns: None
        """
        if writer is None:
            raise TypeError("writer cannot be null.")
        writer.write_str_value("language", self.language)
        writer.write_int_value("maxCharsPerSegment", self.max_chars_per_segment)
        writer.write_int_value("maxWordsPerSegment", self.max_words_per_segment)
        writer.write_str_value("presignedUrl", self.presigned_url)
    

