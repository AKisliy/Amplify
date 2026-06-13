# ElevenLabs — Pay-as-you-go vs Subscription

## Overview

ElevenLabs has two ways to pay: a monthly subscription (tiered) or Pay-as-you-go (PAYG) credit top-ups without a subscription. Both have different implications for available features and pricing.

## Subscription tiers (as of mid-2026)

| Tier | Monthly price | Key extras vs Free |
|------|---------------|--------------------|
| Free | $0 | 10k chars TTS/mo, 1 instant voice clone, no STS on monthly quota |
| Starter | ~$5 | ~30k chars, STS included |
| Creator | ~$22 | 100k chars, `mp3_44100_192`, instant clone unlimited |
| Pro | ~$99 | 500k chars, `pcm_44100` / `wav_44100`, professional voice clone |
| Scale / Business | $330+ | High volume, priority queues |

## Pay-as-you-go (PAYG)

Introduced in May 2026. Allows using ElevenLabs APIs without a subscription by pre-purchasing credit packs.

**Key facts:**
- No monthly commitment
- Pricing per API call:
  - Speech-to-Speech (STS / Voice Changer): **$0.12 / minute**
  - TTS: per-character pricing
- Feature set is equivalent to **Free tier**, not to any paid subscription
- Available voice formats are limited to Free-tier formats (see [[elevenlabs-output-formats]])
- Voices available: all standard/premium library voices, 1 instant clone; no Professional Voice Cloning
- Enabled by adding credits via "+ Add credits" in the ElevenAPI dashboard

## How our project uses it

The project uses a PAYG account (no active subscription) for ElevenLabs STS calls in ai-gateway. This means:

- **Available formats:** everything except `mp3_44100_192`, `pcm_44100`, `wav_44100`
- **Chosen default:** `mp3_44100_128` — best MP3 quality within PAYG limits, $0.12/min
- API key is configured in ai-gateway and calls go directly to ElevenLabs (not through LiteLLM, because ElevenLabs STS is not a standard LiteLLM route — see AMPLIFY-409 decisions)

## Related

- [[elevenlabs-output-formats]]
