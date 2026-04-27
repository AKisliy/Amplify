import logging
import subprocess
from typing import List

class FFmpegCommandExecutor:
    """Выполняет команды ffmpeg через subprocess."""
    def execute(self, command: List[str]):
        logging.info(f"Executing ffmpeg: {' '.join(command)}")
        result = subprocess.run(command, capture_output=True, text=True)
        if result.stderr:
            logging.info(f"ffmpeg stderr:\n{result.stderr}")
        if result.returncode != 0:
            raise subprocess.CalledProcessError(result.returncode, command, result.stdout, result.stderr)



