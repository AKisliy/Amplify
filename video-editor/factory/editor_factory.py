from editors.base_editor import BaseEditor
from editors.classic_ai_ugc import ClassicAiUgcEditor
from editors.luxury_edit_ffmpeg import LuxuryEditFfmpeg
from editors.base_ugc.editor import BaseUgcEditor
from models.messages.base_create_video_message import CreationArgs


class EditorFactory:
    def get_editor(self, args: CreationArgs) -> BaseEditor:
        match args.format_type:
            case "base-ugc":
                return BaseUgcEditor()
            case "ai-ugc":
                return ClassicAiUgcEditor()
            case "luxury-edit":
                return LuxuryEditFfmpeg()
            case _:
                raise ValueError(f"Unsupported format_type: {args.format_type}")
