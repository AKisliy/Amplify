import os
from models.messages.response.processed_file_response import ProcesedFileResponse
from preprocessors.base_preprocessor import BasePreprocessor
from utils.scene_changes_detector import get_changes_timecodes
from utils.video_editing_utils import extract_audio


class LuxuryReferencePreprocessor(BasePreprocessor):
    def preproccess_file(self, file_path: str, base_path: str) -> ProcesedFileResponse:
        absolute_path = os.path.join(base_path, file_path)
        audio_path = extract_audio(absolute_path)

        relative_audio_path = os.path.relpath(audio_path, base_path)
        
        result = ProcesedFileResponse(
            processed_file_path=relative_audio_path
        )

        return result

        