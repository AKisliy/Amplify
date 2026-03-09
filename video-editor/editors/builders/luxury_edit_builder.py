from typing import List

class LuxuryEditCommandBuilder:
    """Строит списки аргументов для команд ffmpeg, используемых в Luxury Edit."""

    def build_cut_command(self, input_path: str, start_time: float, duration: float, output_path: str) -> List[str]:
        """Создает команду для вырезания фрагмента видео."""
        return [
            "ffmpeg",
            "-ss", str(start_time),
            "-i", input_path,
            "-t", str(duration),
            "-c", "copy",
            output_path
        ]

    def build_cut_from_end_command(self, input_path: str, duration: float, output_path: str) -> List[str]:
        """Создает команду для вырезания "хука" с конца видео."""
        return [
            "ffmpeg",
            "-sseof", f"-{str(duration)}",
            "-i", input_path,
            output_path
        ]

    def build_concat_command(self, concat_file_path: str, output_path: str) -> List[str]:
        """Создает команду для конкатенации видео из текстового файла."""
        return [
            "ffmpeg",
            "-f", "concat",
            "-safe", "0",
            "-i", concat_file_path,
            # "-c", "copy",
            output_path
        ]

    def build_image_overlay_command(self, input_video: str, caption_image: str, output_video: str) -> List[str]:
        """Создает команду для наложения изображения с подписью на видео."""
        return [
            "ffmpeg",
            "-i", input_video,
            "-loop", "1",
            "-i", caption_image,
            "-filter_complex", "[1:v]format=rgba,setpts=PTS-STARTPTS[overlay]; [0:v][overlay]overlay=W/2-w/2:H/2-h/2:shortest=1",
            "-c:a", "copy",
            output_video
        ]

    def build_add_audio_command(self, input_video: str, audio_path: str, output_video: str) -> List[str]:
        """Создает команду для добавления финальной аудиодорожки к видео."""
        return [
            "ffmpeg",
            "-i", input_video,
            "-i", audio_path,
            "-map", "0:v",
            "-map", "1:a",
            "-c:v", "copy",
            "-shortest",
            output_video
        ]
