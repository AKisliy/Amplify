from __future__ import annotations
from collections.abc import Callable
from kiota_abstractions.base_request_builder import BaseRequestBuilder
from kiota_abstractions.get_path_parameters import get_path_parameters
from kiota_abstractions.request_adapter import RequestAdapter
from typing import Any, Optional, TYPE_CHECKING, Union

if TYPE_CHECKING:
    from .transcribe.transcribe_request_builder import TranscribeRequestBuilder
    from .voiceover.voiceover_request_builder import VoiceoverRequestBuilder

class ApiRequestBuilder(BaseRequestBuilder):
    """
    Builds and executes requests for operations under /api
    """
    def __init__(self,request_adapter: RequestAdapter, path_parameters: Union[str, dict[str, Any]]) -> None:
        """
        Instantiates a new ApiRequestBuilder and sets the default values.
        param path_parameters: The raw url or the url-template parameters for the request.
        param request_adapter: The request adapter to use to execute the requests.
        Returns: None
        """
        super().__init__(request_adapter, "{+baseurl}/api", path_parameters)
    
    @property
    def transcribe(self) -> TranscribeRequestBuilder:
        """
        The transcribe property
        """
        from .transcribe.transcribe_request_builder import TranscribeRequestBuilder

        return TranscribeRequestBuilder(self.request_adapter, self.path_parameters)
    
    @property
    def voiceover(self) -> VoiceoverRequestBuilder:
        """
        The voiceover property
        """
        from .voiceover.voiceover_request_builder import VoiceoverRequestBuilder

        return VoiceoverRequestBuilder(self.request_adapter, self.path_parameters)
    

