# Capital Burn

> Zone 1 — Input Matrix | Metric 1

**Total Content Spend (Capital Burn)** — cumulative cost of running the Amplify pipeline over a given period. In a fully automated engine, capital is consumed dynamically by compute cycles, token usage, and API calls — not fixed human overhead.

## Diagnostic Value

- **Top drain identification** — which API dependency is the biggest cost centre
- **Friction detection** — if spend spikes but output volume is flat, capital is being sunk into failed generations (API charges + time lost)
- **Scaling vs. waste** — healthy growth = spend increase correlated with output volume increase

## Reference Graph

![Capital Burn Dashboard](../../../assets/Pasted%20image%2020260512113645.png)

## Related Concepts

- `zone-1-input-matrix` — parent zone *(not yet created)*
- `output-volume` — next Zone 1 metric *(not yet created)*
- `unit-economics` — cost-per-asset = Capital Burn ÷ Output Volume *(not yet created)*
