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
