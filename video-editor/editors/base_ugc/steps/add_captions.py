from editors.base_ugc.context import EditingContext
from editors.base_ugc.steps.base_step import PipelineStep


class AddCaptionsStep(PipelineStep):
    name = "Adding captions"

    def execute(self, ctx: EditingContext) -> None:
        # TODO: transcribe audio with Whisper → generate SRT →
        #       overlay with SubtitlesClip using ctx.args.captions_settings.font / font_size
        raise NotImplementedError("Caption generation is not yet implemented")
