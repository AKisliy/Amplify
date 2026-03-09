from typing import Type
from pydantic import BaseModel

class RequestConsumerSetup(BaseModel):
    publisher_exchange_name: str
    consumer_queue_name: str
    response_exchange_name: str | None = None