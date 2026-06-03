# Yield Efficiency

> Zone 1 — Input Matrix | Structural Compute Cost

**Yield Efficiency** — the average generation cost (CPA) broken down and isolated by specific template. It answers which creative formats are financially viable to run at high volumes.

Not all formats require the same structural compute effort (e.g. an "ASMR Hook" might cost $0.50 using only Text/Audio nodes, while a "Heavy Cinematic" costs $4.50 relying on multiple Veo3 video generation nodes).

## Operational Insight: Arbitrage Allocation
Operators use Yield Efficiency to guide volume allocation:
- Flood the pipeline with cheap, well-performing formats.
- Tightly restrict the volume of expensive, "heavy" formats unless they guarantee massive GMV returns.

## Bounding the Data

To maintain an accurate "Dashboard of Truth", Yield Efficiency must be bounded by both time and statistical significance to avoid edge cases:

1. **Time Frame (Last 30 Days):** Aligns with actual monthly API billing cycles and captures current system health (recent API price changes, or sudden algorithm-driven failure rates). Using an event-series like "Last 100 generations" creates blind spots for new templates (cold start) or outdated templates (stale pricing).
2. **Statistical Threshold:** Only templates with **> 10 attempted generations** within that 30-day window are displayed to prevent a single anomalous failure from skewing the average.

## Reference Graph

![Yield Efficiency: Structural Cost Breakdown per Template](../../../assets/Pasted%20image%2020260512150830.png)

## Related Concepts

- [[concepts/cpa]] — the global average across all templates
- [[concepts/capital-burn]] — the total raw spend tracking
