from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class BrokerModel(BaseModel):
    """Base class for all RabbitMQ message models.

    Serializes to camelCase (by_alias=True) for the wire,
    accepts both camelCase and snake_case on deserialization.
    """

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )
