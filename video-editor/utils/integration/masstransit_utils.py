import json
import re

from pydantic import BaseModel

from models.envelope import Envelope


def createMassTransitResponse(result: BaseModel, requestBody: Envelope, message_type: str):
    response = {
        'requestId': requestBody.request_id,
        'correlationId': requestBody.correlation_id,
        'conversationId': requestBody.conversation_id,
        'initiatorId': requestBody.correlation_id,
        'sourceAddress': requestBody.destination_address,
        'destinationAddress': requestBody.source_address,
        'messageType': [
            message_type
        ],     
        'message': result.model_dump(by_alias=True)
    }

    return json.dumps(response)

#It just extract the exchange name from a URI
def getExchangeName(requestBody: Envelope) -> str:
    address = requestBody.responseAddress
    if not address:
        return ""
    parts = re.search(r"/(\w+)\?", address)
    if not parts:
        raise Exception(f"Couldn't get address from {address}")
    return parts.group(1)