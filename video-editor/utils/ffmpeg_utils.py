import logging
import subprocess
from typing import List

class FFmpegCommandExecutor:
    """Выполняет команды ffmpeg через subprocess."""
    def execute(self, command: List[str]):
        logging.debug(f"Executing ffmpeg with command: {command}")
        subprocess.run(command, check=True)



