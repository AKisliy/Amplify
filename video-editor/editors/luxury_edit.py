import os
from typing import Any, Dict

from moviepy import CompositeVideoClip, VideoFileClip, concatenate_videoclips
from editors.base_editor import BaseEditor
from models.creation_args.luxury_edit import LuxuryEditArgs

from utils.emoji_clip import get_image_clip_from_text_with_emojis


class LuxuryEditEditor(BaseEditor):
    def edit_video(self, args: Dict[str, Any], base_path: str) -> str:
        video_args = LuxuryEditArgs(**args).with_absolute_paths(base_path)

        video_paths = video_args.fragments_path
        scene_changes = video_args.scene_changes

        clips = [VideoFileClip(path) for path in video_paths]

        start = 0
        final_clips = []

        for i, drop_time in enumerate(scene_changes):
            clip = clips[i]
            duration = drop_time - start
            subclip = clip.subclipped(0, min(duration, clip.duration))
            final_clips.append(subclip)
            start = drop_time

        clip = clips[-1]
        duration = video_args.original_duration - start
        subclip = clip.subclipped(0, min(duration, clip.duration))
        final_clips.append(subclip)

        # Преобразование в clip
        text = video_args.caption

        caption_clip = get_image_clip_from_text_with_emojis(text, final_clips[-1].size)
        caption_clip = caption_clip.with_duration(video_args.original_duration)

        final_video = concatenate_videoclips(final_clips,  method='compose')

        final_video = CompositeVideoClip([final_video, caption_clip.with_position(("center", "center"))]) 

        final_video.write_videofile(
            video_args.output_path, 
            audio=video_args.audio_path,
            audio_codec='aac',
            logger=None,
            threads=4
        )

        return os.path.relpath(video_args.output_path, base_path)