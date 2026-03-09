from editors.base_editor import BaseEditor
from editors.classic_ai_ugc import ClassicAiUgcEditor
from editors.luxury_edit import LuxuryEditEditor
from editors.luxury_edit_ffmpeg import LuxuryEditFfmpeg
from models.enum.video_format import VideoFormat


class EditorFactory():
    def get_video_editor(self, format: VideoFormat) -> BaseEditor:
        if format == VideoFormat.AiUgc:
            return ClassicAiUgcEditor()
        elif format == VideoFormat.LuxuryEdit:
            return LuxuryEditFfmpeg()
        else:
            raise ValueError(f"Unsupported video format: {format}")