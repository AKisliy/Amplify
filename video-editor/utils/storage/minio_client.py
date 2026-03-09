import os
import boto3
from botocore.config import Config


def get_s3_client():
    host = os.getenv("MINIO_HOST", "localhost:9000")
    use_ssl = os.getenv("MINIO_USE_SSL", "false").lower() == "true"
    scheme = "https" if use_ssl else "http"
    return boto3.client(
        "s3",
        endpoint_url=f"{scheme}://{host}",
        aws_access_key_id=os.getenv("MINIO_ACCESS_KEY", "admin"),
        aws_secret_access_key=os.getenv("MINIO_SECRET_KEY", "password"),
        config=Config(signature_version="s3v4"),
        region_name=os.getenv("MINIO_LOCATION", "us-east-1"),
    )


def get_presigned_url(client, bucket: str, key: str, expires: int = 3600) -> str:
    return client.generate_presigned_url(
        "get_object",
        Params={"Bucket": bucket, "Key": key},
        ExpiresIn=expires,
    )


def upload_from_file(client, bucket: str, key: str, path: str, content_type: str = "video/mp4"):
    client.upload_file(path, bucket, key, ExtraArgs={"ContentType": content_type})
