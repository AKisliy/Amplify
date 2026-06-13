# ElevenLabs STS — Output Formats

Output format is set via the `output_format` query parameter, encoded as `codec_samplerate_bitrate` (e.g. `mp3_44100_128`).

## MP3

| Format | Sample rate | Bitrate | Min plan |
|--------|-------------|---------|----------|
| `mp3_22050_32` | 22.05 kHz | 32 kbps | Free |
| `mp3_24000_48` | 24 kHz | 48 kbps | Free |
| `mp3_44100_32` | 44.1 kHz | 32 kbps | Free |
| `mp3_44100_64` | 44.1 kHz | 64 kbps | Free |
| `mp3_44100_96` | 44.1 kHz | 96 kbps | Free |
| `mp3_44100_128` | 44.1 kHz | 128 kbps | Free (**API default**) |
| `mp3_44100_192` | 44.1 kHz | 192 kbps | Creator+ |

## PCM (raw, uncompressed)

| Format | Sample rate | Min plan |
|--------|-------------|----------|
| `pcm_8000` | 8 kHz | Free |
| `pcm_16000` | 16 kHz | Free |
| `pcm_22050` | 22.05 kHz | Free |
| `pcm_24000` | 24 kHz | Free |
| `pcm_32000` | 32 kHz | Free |
| `pcm_44100` | 44.1 kHz | Pro+ |
| `pcm_48000` | 48 kHz | Free |

## WAV

| Format | Min plan |
|--------|----------|
| `wav_8000` | Free |
| `wav_16000` | Free |
| `wav_22050` | Free |
| `wav_24000` | Free |
| `wav_32000` | Free |
| `wav_44100` | Pro+ |
| `wav_48000` | Free |

## Opus

| Format | Bitrate | Min plan |
|--------|---------|----------|
| `opus_48000_32` | 32 kbps | Free |
| `opus_48000_64` | 64 kbps | Free |
| `opus_48000_96` | 96 kbps | Free |
| `opus_48000_128` | 128 kbps | Free |
| `opus_48000_192` | 192 kbps | Free |

## Telephony

| Format | Use case |
|--------|----------|
| `ulaw_8000` | Twilio (μ-law, 8 kHz) |
| `alaw_8000` | Telephony (A-law, 8 kHz) |

## Summary: Free/PAYG limits

Formats **not** available on Free/PAYG:
- `mp3_44100_192` — requires Creator+
- `pcm_44100` — requires Pro+
- `wav_44100` — requires Pro+

**Recommended default for this project:** `mp3_44100_128` — best MP3 quality on Free/PAYG, matches the ElevenLabs API default.

## Related

- [[elevenlabs-payg-vs-subscription]]
