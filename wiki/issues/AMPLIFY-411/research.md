# Research: AMPLIFY-411

## Overview

ElevenLabs STS (Speech-to-Speech / Voice Changer) supports many output formats via the `output_format` query parameter. The current ai-gateway implementation hardcodes the lowest quality (`mp3_22050_32`). The goal is to switch to `mp3_44100_128` — the best quality available without a paid subscription.

## Concepts

| Concept | Summary |
|---------|---------|
| [[concepts/elevenlabs-output-formats]] | Full table of formats by codec, sample rate, bitrate, and minimum plan |
| [[concepts/elevenlabs-payg-vs-subscription]] | PAYG billing model vs subscription tiers and their differences |

## Open Questions

_None._
