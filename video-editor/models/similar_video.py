from pydantic import BaseModel


class SimilarVideo(BaseModel):
    file_id: str | None
    frame_numbers: list[int]
    hashes: list[str]