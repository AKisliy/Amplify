from abc import ABC, abstractmethod
from models.messages.response.processed_file_response import ProcesedFileResponse

class BasePreprocessor(ABC):
    @abstractmethod
    def preproccess_file(self, file_path: str, base_path: str) -> ProcesedFileResponse:
        pass