# Entity Efficiency

> Zone 1 — Input Matrix | Persona Compute Cost

**Entity Efficiency** — the average generation cost (CPA) grouped by the Project (Ambassador) entity. Just as a traditional agency pays different commission rates to different human creators, the Amplify system incurs different compute costs for different digital clones.

## Drivers of Persona Cost

Even when using the same templates, Ambassador costs diverge due to intrinsic traits:

1. **Voice Model Friction:** ElevenLabs audio clones with high mispronunciation rates require multiple regeneration cycles (sunk API cost).
2. **Visual Complexity:** Projects anchored in complex visual settings require heavier Veo3 video generation processing.
3. **Safety Policy Rejections:** Niche-specific prompts (e.g., skincare, fitness) may frequently trigger false-positive safety filters from TikTok or OpenAI, driving up the failed-generation rate.

## Operational Action: Capital Re-allocation

Operators use this metric to optimize the pipeline:
- **Throttle** inefficient digital clones (e.g., those with $4.20 CPA) until engineers improve their voice/prompt models.
- **Flood** the pipeline with highly efficient clones (e.g., those with $1.10 CPA) to maximize output within the capital budget.

## Reference Graph

![Entity Efficiency: CPA vs. Total Spend per Ambassador](../../../assets/Pasted%20image%2020260512160606.png)

This mixed-axis visualization reveals whether the pipeline is healthily optimized:
- **Bars (Average CPA):** Flags inefficient digital clones (e.g., red bars).
- **Line (Total Spend Allocation):** Shows where the total budget has been distributed over the last 30 days.
- **Proof of Optimization:** A healthy system demonstrates high total spend allocated to low-CPA Ambassadors, and minimal spend wasted on high-CPA Ambassadors.

## Related Concepts

- [[concepts/cpa]] — the global unit cost
- [[concepts/yield-efficiency]] — generation cost isolated by Template (Format) instead of Ambassador
