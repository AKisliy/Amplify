import google.auth.transport.requests
from google.oauth2 import service_account
from pydantic import BaseModel

from comfy_api.latest import IO

from config import gemini_config, media_ingest_config
from .client import sync_op, ApiEndpoint

_gcp_credentials = None

def get_vertex_ai_access_token() -> str:
    global _gcp_credentials
    if _gcp_credentials is None:
        _gcp_credentials = service_account.Credentials.from_service_account_file(
            gemini_config.service_account_key_file,
            scopes=["https://www.googleapis.com/auth/cloud-platform"]
        )
    
    if not _gcp_credentials.valid:
        request = google.auth.transport.requests.Request()
        _gcp_credentials.refresh(request)
        
    return _gcp_credentials.token

class GetLinkByIdResponse(BaseModel):
    mediaId: str | None = None
    link: str | None = None

async def fetch_media_uri_from_ingest(
    cls: type[IO.ComfyNode],
    media_id: str,
) -> str:
    """Fetches the cloud storage URI for a media file from the Media Ingest API."""
    
    full_url = f"{media_ingest_config.media_ingest_url}/internal/media/{media_id}/link"
    
    # Pass the endpoint with the full URL and query_params 
    response = await sync_op(
        cls,
        endpoint=ApiEndpoint(path=full_url, method="GET", query_params={"linkType": 0}),
        response_model=GetLinkByIdResponse,
        wait_label="Fetching Media Link...",
    )
    
    if not response.link:
        raise ValueError(f"Media Ingest API response for UUID {media_id} did not contain a 'link'.")
        
    return response.link

class MediaRegisterParameters(BaseModel):
    gsUri: str
    contentType: str

class MediaRegisterRequest(BaseModel):
    files: list[MediaRegisterParameters]

class MediaRegisterResponse(BaseModel):
    importedMediaIds: list[str]

async def register_media_uri_with_ingest(
    cls: type[IO.ComfyNode],
    gcs_uri: str,
    content_type: str = "video/mp4"
) -> str:
    """Registers a direct Google Cloud Storage URI with Media Ingest to obtain a UUID."""
    
    full_url = f"{media_ingest_config.media_ingest_url}/internal/media/import-gs"
    
    response = await sync_op(
        cls,
        endpoint=ApiEndpoint(path=full_url, method="POST"),
        data=MediaRegisterRequest(
            files=[
                MediaRegisterParameters(
                    gsUri=gcs_uri,
                    contentType=content_type,
                )
            ]
        ),
        response_model=MediaRegisterResponse,
        wait_label="Registering Media UUID...",
    )
    
    if not response.importedMediaIds or len(response.importedMediaIds) == 0:
        raise ValueError("Media Ingest API failed to return any importedMediaIds during import.")
        
    return response.importedMediaIds[0]