from editors.base_ugc.context import EditingContext
from editors.base_ugc.steps.base_step import PipelineStep


class GenerateVoiceoverStep(PipelineStep):
    name = "Generating voiceover"

    def execute(self, ctx: EditingContext) -> None:
        # TODO: integrate with TTS API (e.g. ElevenLabs) using ctx.args.voiceover_settings.voice_id
        raise NotImplementedError("Voiceover generation is not yet implemented")
