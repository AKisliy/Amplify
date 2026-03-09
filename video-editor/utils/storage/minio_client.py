import os
import tempfile
from datetime import timedelta
from minio import Minio


def get_minio_client() -> Minio:
    return Minio(
        os.getenv("MINIO_HOST", "localhost:9000"),
        access_key=os.getenv("MINIO_ACCESS_KEY", "admin"),
        secret_key=os.getenv("MINIO_SECRET_KEY", "password"),
        secure=os.getenv("MINIO_USE_SSL", "false").lower() == "true",
    )


def get_presigned_url(client: Minio, bucket: str, key: str, expires: timedelta = timedelta(hours=1)) -> str:
    return client.presigned_get_object(bucket, key, expires=expires)


def upload_from_file(client: Minio, bucket: str, key: str, path: str, content_type: str = "video/mp4"):
    client.fput_object(bucket, key, path, content_type=content_type)
