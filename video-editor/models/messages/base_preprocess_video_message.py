from models.broker_model import BrokerModel
from models.enum.file_type import FileType


class BasePrepocessVideoMessage(BrokerModel):
    file_path: str
    file_type: FileType
