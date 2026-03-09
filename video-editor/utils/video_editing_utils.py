import logging
import os
from pathlib import Path
import subprocess
import uuid

from moviepy import VideoFileClip
from scenedetect import split_video_ffmpeg

from utils.scene_changes_detector import get_changes_timecodes


def extract_audio(input_file: str) -> str:
    if os.path.exists(input_file) and input_file.endswith(".mp4"):
        try:
            # Extract the filename without extension
            filename = os.path.basename(input_file)
            output_file = os.path.join(os.path.dirname(input_file), f"{os.path.splitext(filename)[0]}.mp3")

            # Load video file
            video_clip = VideoFileClip(input_file)

            # Extract audio from video
            audio_clip = video_clip.audio
            if not audio_clip:
                raise Exception("No audio in provided path: {audio_clip}", audio_clip)

            audio_clip.write_audiofile(output_file, codec='mp3', bitrate='320k')

            audio_clip.close()
            video_clip.close()

            logging.info("Successfully extracted audio from {file_name} to {output_file}", filename, output_file)

            return output_file
        except Exception as e:
            logging.error("Error processing {input_file}: {e}", input_file, e)
            raise
    else:
        logging.error("The file {input_file} does not exist or is not a valid MP4 file.", input_file)
        raise Exception("File not found ({input_file})", input_file)

def get_duration(media_path: str) -> float:
    if os.path.exists(media_path):
        try:
            # Load video file
            result = subprocess.run(
                [
                    "ffprobe", 
                    "-v", "error", 
                    "-show_entries",
                    "format=duration", "-of",
                    "default=noprint_wrappers=1:nokey=1", 
                    media_path
                ],
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT
            )
            return float(result.stdout)

        except Exception as e:
            logging.error("Error getting duration for {input_file}: {e}", input_file=media_path, e=e)
            raise
    else:
        logging.error("The file {input_file} does not exist or is not a valid MP4 file.", input_file=media_path)
        raise Exception(f"File not found ({media_path})")

def split_video(file_path: str, output_dir: str) -> list[str]:
    scene_list = get_changes_timecodes(file_path)
    video_name = str(uuid.uuid4())
    _, file_extension = os.path.splitext(file_path)
    output_file_template = f"$VIDEO_NAME-Scene-$SCENE_NUMBER{file_extension}"
    ffmpeg_output = split_video_ffmpeg(
        file_path, 
        scene_list, 
        Path(output_dir),
        video_name=video_name,
        output_file_template=output_file_template,
        show_output=True
    )
    if ffmpeg_output:
        raise Exception(f"Video splitting with ffmpeg returned error code: {ffmpeg_output}")
    res = _form_scenes_result(len(scene_list), video_name, output_dir, file_extension)
    return res

def _form_scenes_result(scenes_count: int, video_name: str, output_dir: str, file_extension: str) -> list[str]:
    res = []
    for i in range(1, scenes_count + 1):
        scene = "Scene-"
        if i < 10:
            scene += f"00{i}"
        elif i < 100:
            scene += f"0{i}"
        else:
            scene += f"{i}"
        res.append(os.path.join(output_dir, f"{video_name}-{scene}{file_extension}"))
    return res
