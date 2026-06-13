# AMPLIFY-411: Tune ElevenLabs voice output format

## Goal

Upgrade the audio output format for ElevenLabs STS calls in ai-gateway from the lowest quality (`mp3_22050_32`) to the best quality available on Free/PAYG tier (`mp3_44100_128`).

## Context

The voiceover endpoint in ai-gateway (`POST /api/voiceover`) calls ElevenLabs STS via a generated Kiota client. The output format is controlled by the `output_format` query parameter. Currently hardcoded to `mp3_22050_32` — the worst quality available.

ElevenLabs is accessed via PAYG (Pay-as-you-go) billing without a subscription. This caps the available formats at Free-tier limits.

## Design Decisions

- Default format: `mp3_44100_128` — best MP3 quality on Free/PAYG, matches ElevenLabs API default, no subscription required.
- The format is exposed as an optional parameter in `VoiceoverRequest` so callers can override it in the future without another code change.
- The enum `PostOutput_formatQueryParameterType` (auto-generated Kiota) already contains `Mp3_44100_128`.

## Acceptance Criteria

- [ ] `ElevenLabsService.SpeechToSpeechAsync` uses `Mp3_44100_128` by default
- [ ] `VoiceoverRequest` accepts an optional `OutputFormat` parameter
- [ ] Wiki documents ElevenLabs audio formats and PAYG vs subscription billing

## Out of Scope

- Changing the ElevenLabs voice model
- Supporting PCM/WAV/Opus output from the voiceover endpoint
- Any changes to transcription endpoint
