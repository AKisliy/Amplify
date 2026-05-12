# Output Volume Velocity

> Zone 2 — Output Layer | Metric 1

**Output Volume Velocity** — the absolute count of *successfully verified* videos produced over a given time window (daily/weekly). Measures raw throughput of the pipeline: not how fast one item is generated, but how many finished items exit the system.

## Relationship to Zone 1

| Input (Zone 1) | Output (Zone 2) |
|----------------|-----------------|
| Capital Burn ($) | Output Volume (videos) |
| Generation Velocity (time/asset) | — |

Output Volume is the numerator that justifies Capital Burn. A healthy engine shows both metrics rising at the same angle. **Divergence is the failure signal**: if Capital Burn spikes while Output Volume stays flat or drops, the engine is consuming fuel without producing assets (failed HITL verification, prompt loops, node errors).

## Segmentation

Tracked per template to isolate which content format is choking the pipeline:

- Product Showcase
- Testimonial
- ASMR Hook
- Unboxing
- Trend Reaction

## Diagnostic Value

- **Efficiency ratio** — Output Volume ÷ Capital Burn = videos per $1k (e.g. 5.5 Vid/$k); the primary unit-economics KPI
- **Divergence detection** — Capital Burn spike + flat Output Volume = stalled engine
- **Template bottleneck** — per-template segmentation identifies which format is dragging throughput

## Reference Graph

![Production Velocity & Burn Explorer](../../../assets/Pasted%20image%2020260512140846.png)

## Related Concepts

- [[concepts/capital-burn]] — the cost input; paired with Output Volume to derive efficiency ratio
- [[concepts/generation-velocity]] — per-asset speed; Output Volume Velocity is the aggregate daily count
- `unit-economics` — cost-per-asset = Capital Burn ÷ Output Volume *(not yet created)*
