from typing import Any, Dict
from moviepy import CompositeVideoClip, VideoFileClip, AudioFileClip, concatenate_videoclips, TextClip
from moviepy.video.tools.subtitles import SubtitlesClip

from editors.base_editor import BaseEditor
from models.creation_args.ai_ugc import AiUgcArgs
from utils.formatter import format_clip


class ClassicAiUgcEditor(BaseEditor):
    def edit_video(self, args: Dict[str, Any], base_path: str) -> str:
        video_args = AiUgcArgs(**args).with_absolute_paths(base_path)
        target_resolution = (1080, 1920)  
        target_fps = 30

        generator = lambda txt: TextClip(
            text=txt,
            font='Mont-Black',
            font_size=50,
            color='white', 
            margin=(50, 5, 50, 0),
            method="caption",
            text_align='center',
            size=(900, None), 
            interline=6,
            stroke_color='black',
            stroke_width=4
        )
        voiceover_subs = SubtitlesClip(video_args.voiceover_srt_path, make_textclip=generator)
        hook_subs = SubtitlesClip(video_args.hook_srt_path, make_textclip=generator)

        hook_clip = VideoFileClip(video_args.hook_path)
        broll_clip = VideoFileClip(video_args.broll_path)
        voiceover_audio = AudioFileClip(video_args.voiceover_path)

        hook_clip = format_clip(hook_clip, target_resolution, target_fps)
        hook_clip = CompositeVideoClip([hook_clip, hook_subs.with_position(("center", 1400))])

        captioned_clip = format_clip(broll_clip, target_resolution, target_fps)
        captioned_clip = captioned_clip.with_audio(voiceover_audio)
        captioned_clip = CompositeVideoClip([captioned_clip, voiceover_subs.with_position(('center', 800))])

        final_clips = [hook_clip]
        final_video = concatenate_videoclips(final_clips, method="compose")

        final_video.write_videofile(
            video_args.output_path,
            codec="libx264",  
            audio_codec="aac",  
            fps=target_fps,
            bitrate="5000k",
            threads=4,
            preset='veryfast',
            logger=None,
        )

        hook_clip.close()
        broll_clip.close()
        voiceover_audio.close()
        captioned_clip.close()
        final_video.close()

        print("Success")
        return video_args.output_path