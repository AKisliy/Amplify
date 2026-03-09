from converters.base_converter import BaseConverter
from converters.whisper_converter import WhisperConverter
from models.enum.media_constraints import MediaConstraints


class ConverterFactory:
    def get_converter(self, constraints: MediaConstraints) -> BaseConverter:
        if constraints == MediaConstraints.Whisper:
            return WhisperConverter()
        else:
            raise Exception(f"No converter found for constraints {constraints}")