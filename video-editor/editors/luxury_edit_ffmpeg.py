import logging
from typing import Any, Dict, List
from moviepy import VideoFileClip

from editors.base_editor import BaseEditor
from models.creation_args.luxury_edit import LuxuryEditArgs
from utils.emoji_clip import get_png_from_text_with_emojis
from utils.ffmpeg_utils import FFmpegCommandExecutor
from editors.builders.luxury_edit_builder import LuxuryEditCommandBuilder
from utils.editing_workspace import WorkspaceManager

class LuxuryEditFfmpeg(BaseEditor):
    def __init__(self, 
                 command_builder: LuxuryEditCommandBuilder | None = None, 
                 command_executor: FFmpegCommandExecutor | None = None,
                 workspace_manager: WorkspaceManager | None = None):
        self.builder = command_builder or LuxuryEditCommandBuilder()
        self.executor = command_executor or FFmpegCommandExecutor()
        self.workspace_manager = workspace_manager or WorkspaceManager()

    def edit_video(self, args: Dict[str, Any], base_path: str) -> str:
        video_args = LuxuryEditArgs(**args).with_absolute_paths(base_path)
        self._verify_input(video_args)
        self.workspace = self.workspace_manager.create_workspace(base_path)

        try:
            cut_paths = self._get_cuts(video_args)

            concated_video_path = self._concat_cuts(cut_paths)
  
            caption_image_path = self._get_caption_png(video_args.caption, VideoFileClip(cut_paths[-1]).size)
            
            captioned_file_path = self._overlay_video_with_png(concated_video_path, caption_image_path)

            output_path = self._add_audio(captioned_file_path, video_args.audio_path, video_args.output_path)

            return output_path
        finally:
            self.workspace.cleanup()
    
    def _verify_input(self, args: LuxuryEditArgs) -> None:
        scene_count = len(args.scene_changes) + 1
        files_count = len(args.fragments_path)

        if scene_count != files_count:
            logging.error(f"Invalid arguments provided to luxury edit: scene count is {scene_count}, but files count is {files_count}")
            raise Exception(f"Invalid arguments provided to luxury edit: scene count is {scene_count}, but files count is {files_count}")
        
        if scene_count == 1:
            logging.warning(f"Got no scene changes for luxury video generation. That looks suspicious... (Video will be generated with only 1 fragment)")
    
    def _get_cuts(self, args: LuxuryEditArgs) -> List[str]:
        scene_changes = args.scene_changes
        scene_changes.append(args.original_duration)

        fragments_path = args.fragments_path        
        hook_duration = scene_changes[0]
        hook_path = self._get_hook(hook_duration, fragments_path[0])

        cut_paths = [hook_path]
        start_time = hook_duration

        for i, drop_time in enumerate(scene_changes[1:]):
            duration = drop_time - start_time
            output_cut = self._create_cut(duration, fragments_path[i + 1])
            cut_paths.append(output_cut)
            start_time = drop_time

        return cut_paths
    
    def _get_hook(self, hook_duration: float, file_path):
        hook_path = self.workspace.get_temp_path('mp4')
        cut_command = self.builder.build_cut_from_end_command(file_path, hook_duration, hook_path)
        self.executor.execute(cut_command)

        return hook_path
    
    def _create_cut(self, duration: float, file_path: str) -> str:
        output_cut = self.workspace.get_temp_path('mp4')
        cut_command = self.builder.build_cut_command(file_path, 0, duration, output_cut)
        self.executor.execute(cut_command)
        
        return output_cut
    
    def _concat_cuts(self, cuts: List[str]) -> str:
        concat_file_path = self.workspace.create_concat_file(cuts)
        intermediate_file_path = self.workspace.get_temp_path('mp4')
        concat_command = self.builder.build_concat_command(concat_file_path, intermediate_file_path)
        self.executor.execute(concat_command)

        return intermediate_file_path
        
        
    def _get_caption_png(self, caption: str, video_size) -> str:
        caption_image_path = self.workspace.get_temp_path('png')
        caption_image_path = get_png_from_text_with_emojis(caption, video_size, caption_image_path)

        return caption_image_path
    
    
    def _overlay_video_with_png(self, video_path: str, png_path: str) -> str:
        captioned_file_path = self.workspace.get_temp_path('mp4')
        overlay_command = self.builder.build_image_overlay_command(video_path, png_path, captioned_file_path)
        self.executor.execute(overlay_command)

        return captioned_file_path
    
    def _add_audio(self, video_path: str, audio_path: str, output_path) -> str:
        final_command = self.builder.build_add_audio_command(video_path, audio_path, output_path)
        self.executor.execute(final_command)

        return output_path
