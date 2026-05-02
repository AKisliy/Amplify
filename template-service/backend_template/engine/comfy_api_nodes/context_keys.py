"""
Keys for extra_pnginfo execution context.

All nodes that read or write shared per-media metadata must use these
constants to avoid magic strings and key mismatches.

Structure
---------
extra_pnginfo[MEDIA_PROMPTS] : dict[media_id, str]
    Maps each generated video/image media_id to the Veo prompt used
    during its generation. Written by generation nodes, read by HITL nodes.

extra_pnginfo[MEDIA_GEN_PARAMS] : dict[media_id, dict]
    Maps each generated video/image media_id to the full set of generation
    parameters needed for re-generation (model, aspect_ratio, duration,
    resolution, negative_prompt, first_frame_uuid).
    Written by generation nodes, read by HITL nodes.
"""

# extra_pnginfo[MEDIA_PROMPTS][media_id] = veo_prompt: str
MEDIA_PROMPTS = "media_prompts"

# extra_pnginfo[MEDIA_GEN_PARAMS][media_id] = {
#     "model": str,
#     "aspect_ratio": str,
#     "duration": int,
#     "resolution": str,
#     "negative_prompt": str,
#     "first_frame_uuid": str | None,
#     "last_frame_uuid": str | None,
# }
MEDIA_GEN_PARAMS = "media_gen_params"
