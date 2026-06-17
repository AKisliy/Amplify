# Generation Velocity

> Zone 1 — Input Matrix | Metric 2

**Generation Velocity** — the temporal throughput of the Amplify engine, measured as the delta between `finished_at` and `started_at` on the `JobDetail` entity. Tracks **Time** as the second fundamental input constraint alongside Capital Burn.

## Data Source

Derived directly from the `JobDetail` entity:

```
generation_time = finished_at - started_at
```

Fully automated — no manual instrumentation required.

## Resource Offset

Raw compute time is translated into business value by anchoring it against a human baseline:

- **Agency Baseline** — time a traditional team takes to produce one asset end-to-end (ideation → filming → editing → review). Derived from historical payroll data or industry averages.
- **Generation Velocity** — actual AI compute time per asset (e.g. ~2–5 min depending on template)
- **Resource Offset** = Agency Baseline − Generation Velocity = **human hours saved**

This reframes the metric from an operational speed stat into a leverage proof for Tier 1/2 stakeholders (e.g. CMO): the system has decoupled content output from human time constraints.

## Diagnostic Value

- **Per-template bottleneck detection** — tracking velocity per template identifies which format graph is becoming temporally heavy and queuing the pipeline
- **Friction signal** — velocity degradation without a template change indicates infra or API slowdown

## Reference Graph

![Generation Velocity Explorer](../../../assets/Pasted%20image%2020260512135240.png)

## Related Concepts

- [[concepts/capital-burn]] — Metric 1; tracks Capital as the parallel input constraint
- `unit-economics` — cost-per-asset; combines Capital Burn + Generation Velocity *(not yet created)*
- `zone-1-input-matrix` — parent zone *(not yet created)*



**17.06.2026**

# Summary

**Generation Velocity & Resource Offset.** Added the Resource Offset framing — Agency Baseline minus AI generation time — as the mechanism for translating raw compute seconds into human hours saved, making the metric legible to business stakeholders. Proposed replacing the original split dual-chart with a single unified horizontal stacked bar (AI time as a small teal sliver, offset as the large block) to make the leverage immediately visible. Added per-template queue risk flagging for heavy templates and a 30-day velocity trend panel for detecting pipeline weight creep.

![[Pasted image 20260617134412.png]]

### What changed from the original and why

**Original problem:** Two separate mirrored bar charts (AI | Agency) with decorative icon arrows. You had to mentally bridge two separate charts to see the offset — the key insight was invisible.

**New approach: Single unified stacked horizontal bar**
- Each template = one bar row
- Teal segment = AI time (the tiny sliver — visually proves the leverage instantly)
- Indigo/purple segment = Resource Offset (the massive block — the actual insight)
- Amber dashed vertical line = Agency Baseline (the ceiling everything is measured against)
- Templates colored **amber** if they exceed 4 minutes — queue risk flag at a glance

---

### Interactive controls (bottom bar)
- **Agency Baseline slider** — drag from 2h to 12h, all bars and KPIs update live. The resource offset block visually expands/contracts, making the leverage concept tangible
- **Volume input** — changes the "Total Hours Saved" KPI so you can see the multiplier at different production scales (100 videos vs 1,000)

### Right panel
- **Velocity Rank table** — sorted fastest to slowest with the efficiency multiplier (e.g., `171×`) and a micro-bar showing relative weight
- **30-Day Trend** — simulates the avg generation time over time with a slight late-period drift (the concept doc calls this the "bottleneck detection" use case — if this line trends up, the template graph is getting heavier)
