
import subprocess
from converters.base_converter import BaseConverter


class WhisperConverter(BaseConverter):
    convert_command_template = "-i \"{0}\" -ar 16000 -ac 1 -f wav \"{1}\""
    
    def convert_media_from_path(self, media_path: str, output_path: str) -> str:
        command = [
            "ffmpeg",
            "-i", media_path,
            "-ar", "16000",
            "-ac", "1",
            "-f", "wav",
            output_path
        ]

        subprocess.run(command, stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT)
        return output_path