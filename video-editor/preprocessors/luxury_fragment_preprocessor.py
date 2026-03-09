import os
import subprocess

from models.messages.response.processed_file_response import ProcesedFileResponse
from preprocessors.base_preprocessor import BasePreprocessor

class LuxuryFragmentPreprocessor(BasePreprocessor):
    def preproccess_file(self, file_path: str, base_path: str) -> ProcesedFileResponse:
        absolute_path = os.path.join(base_path, file_path)

        filename = os.path.basename(absolute_path)
        output_file = os.path.join(os.path.dirname(absolute_path), f"{os.path.splitext(filename)[0]}.processed.mp4")

        # ffmpeg args
        command = [
            "ffmpeg",
            "-hide_banner",
            "-loglevel", "error",
            "-y",  
            "-i", absolute_path, 
            "-t", "10",  
            "-vf", "scale=1080:1920",  
            "-r", "30",  
            "-b:v", "14M",
            "-an",  
            "-c:v", "libx264", 
            "-preset", "medium",
            "-threads", "8",
            output_file
        ]

        subprocess.run(command, check=True)

        relative_output = os.path.relpath(output_file, base_path)

        return ProcesedFileResponse(
            processed_file_path=relative_output
        )

