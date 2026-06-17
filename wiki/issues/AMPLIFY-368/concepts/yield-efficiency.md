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


**17.06.2026**

# Summary

**Yield Efficiency (by template).** Added reasoning for time-bounding CPA to a rolling window (7/30/90d) instead of "last N generations" — motivated by billing alignment and model rate drift across periods. Defined the minimum threshold (≥10 successful outputs, not attempts, within the window) and clarified that the time window itself serves as the implicit upper bound. Added visualization rationale: stacked bar with per-node AI cost breakdown inside each template bar, enabling comparison against global average CPA for volume allocation decisions.

## Analysis: Your Yield Efficiency Dashboard Reasoning

**Your core understanding is correct.** Let me address each part precisely.

---

### ✅ On Time-Bounding CPA by Template

You're right, and the existing wiki concept already captures *why*: billing is monthly, model pricing drifts frequently, and aggregating across rate epochs produces a number that has no actionable meaning. A blended average across a Veo3 price from 4 months ago and today's price isn't your CPA — it's noise dressed as signal.

The extension you're proposing (7 / 30 / 90 day windows, same as the rest of the dashboard) is the right call, and it's coherent for one additional reason beyond what the concept doc states: **it makes this metric compositionally consistent with Capital Burn.** If your Capital Burn chart is bounded at 30 days and your Yield Efficiency is bounded at 90, a product manager looking at both panels simultaneously gets two different economic realities. Same time window = same frame of reference = trustworthy comparison.

---

### ✅ On the Visualization: Cost Breakdown by AI Node Inside Each Bar

This is the correct extension. A flat bar per template tells you *how much* — the stacked breakdown tells you *why*. The "why" is operationally critical because:

- Two templates can have the **same total CPA** but completely different risk profiles. One might be 90% Veo3 (high volatility if Google changes pricing) and one might be 90% ElevenLabs TTS (stable). Same bar height, radically different budget risk.
- When you're making volume allocation decisions, you need to know whether a cheap template is cheap because it's *structurally lightweight* or just because it happens to have favorable current pricing on a heavy model.

The stacked breakdown makes this visible directly on the graph.

---

### ✅ On the Two Caveats (Rate Drift + Compute Cost) — Both Valid, But One Needs Precision

**Caveat 1: Rate Drift Across Billing Periods** — Fully valid. This is actually the strongest argument for the time window approach. If you generated 50 runs of Template A across 3 months and Veo3 dropped pricing in month 2, averaging all 50 gives you a phantom CPA that reflects neither your current cost nor your historical one accurately. The time window quarantines you to *current pricing reality.*

**Caveat 2: Compute Overhead Scales with Aggregation** — Also valid, but I'd frame it differently. The real concern isn't just that aggregating 50 runs is heavier than aggregating 10 — it's that **an unbounded upper window erodes the signal quality of the metric itself.** Even if compute were free, you wouldn't want to aggregate 200 runs of a template that was last meaningfully iterated 6 months ago. The data is stale by design.

This is where your instinct about a **maximum threshold** is sharp and genuinely adds something the concept doc doesn't fully address.

---

### 🔑 On the Maximum Threshold — This Is the Key New Insight

The concept doc defines the floor (min 10 generations) but doesn't define a ceiling. Your argument for one is correct on two grounds:

1. **Rate epoch corruption:** Once you cross billing cycle boundaries, you're mixing cost regimes. A practical max cap could be: *"Only aggregate runs within the current billing month,"* or alternatively, the sliding window (e.g., last 30 days) already serves as your implicit ceiling — which is why the time window and the threshold work together as a **compound filter**, not two independent controls.

2. **Signal dilution:** If a format ran 200 times 4 months ago and 5 times this week, the 30-day window correctly shows you only those 5 — but if you had no time window and relied on `last N`, you'd be making decisions about current volume allocation based on a statistically dominant but temporally irrelevant past.

The elegant formulation that follows from your reasoning is:

> **Yield Efficiency = Total Spend ÷ Successful Outputs, scoped to runs within the selected time window, displayed only for templates with ≥ 10 generations in that window.**

The time window *is* the maximum threshold. You don't need a separate "max N runs" parameter if the window is correctly defined — because rate drift is already controlled by the temporal boundary, and compute load is bounded by the window size.

---

### One Nuance Worth Flagging

The concept doc uses **"Successful Outputs"** in the denominator (not attempts). This matters especially when the minimum threshold interacts with failure rates. If a template has 15 attempts but 12 failures in 30 days, it clears the 10-generation floor on attempts but might only have 3 successful assets. Do you want the threshold to apply to **attempts** (to detect that a template is being used) or **successes** (to ensure statistical reliability of the CPA)?

This is worth defining explicitly in the wiki because the two give you different operational signals:
- **Threshold on attempts** → detects templates in active use, even if they're failing
- **Threshold on successes** → guarantees the CPA is computed from real output data

For a *cost efficiency* metric, the success-based threshold is more defensible. But for identifying a *failing template* early, you'd want the attempt-based one visible somewhere (possibly surfaced separately, not in the CPA bar).

---

**Summary:** Your reasoning is architecturally sound. The time window serves as both the accuracy mechanism (rate drift) and the implicit max ceiling. The stacked node breakdown is the right visualization layer. The min threshold of 10 should be defined against *successful outputs*, not attempts. Would you like me to update the wiki concept page with these refinements?