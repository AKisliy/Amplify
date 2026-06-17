# Format Volume Velocity

> Zone 2 — Output Layer | Metric 2

**Format Volume Velocity** — the number of distinct creative templates (formats) actively generated and tested by the Amplify pipeline over a given period. It measures the *agility* and *creative diversity* of the output, preventing the engine from spamming identical structures.

## Diagnostic Value

- **Creative Decay Prevention** — ensures the system operates as a multi-variate testing lab rather than just a high-volume generator of single formats.
- **Market Probe Health** — tracks the injection of new "Experimental" formats alongside established "Core" formats. A flatline in active formats indicates the AI is starving for new graphs and requires human intervention (node template design).

## Format Diversity Ratio

Answers whether the system is building a diverse testing net or concentrating risk.

`Format Diversity Ratio = Total Output Volume ÷ Number of Active Templates`

- **Low Ratio (e.g., 20 - 50):** Healthy. Output is distributed across a wide foundation of creative structures.
- **High Ratio (e.g., 500+):** Danger. Volume is dangerously concentrated; if the few active templates decay in market performance, the entire pipeline crashes.

*Note: Unlike most metrics, a LOWER Diversity Ratio is better.*

## Reference Graph

![Format Volume Velocity](../../../assets/Pasted%20image%2020260512142755.png)

## Related Concepts

- [[concepts/output-volume-velocity]] — measures raw throughput (muscle); Format Volume measures diversity (agility)
- `zone-2-output-layer` — parent zone *(not yet created)*



**17.06.2026**

# Summary

**Format Volume Velocity.** Added the three diagnostic questions the dashboard should answer (format count growing, diversity ratio contracting, experimental templates graduating to core). Critiqued the original visualization for placing output volume and format count on the same Y-axis and proposed a split layout: main stacked bar (Core vs. Experimental templates) and a separate Diversity Ratio trend panel. Established that Core/Experimental classification is operator-controlled via a status enum (`experimental → core → archived`), not an auto-threshold on volume. Added the "Active Template" definition scoped to the same time window as other metrics.


## Format Volume Velocity — Dashboard Review

---

### The Core Operational Question

When you open this dashboard, the single question you need to answer is:

> **"Am I running a market experiment or a content loop?"**

More precisely, broken into the three sequential checks you should run in order:

1. **Is the format count growing?** — "Are we feeding the engine with new creative hypotheses, or are we recycling the same graphs?"
2. **Is the Diversity Ratio contracting?** — "As output volume scales up, is it spreading across more templates, or concentrating into fewer?"
3. **Are Experimental templates surviving long enough to become Core?** — "Is the lab producing graduates, or just burning through ideas with no conversion to stable production formats?"

The third question is what this dashboard has that the concept doc doesn't explicitly surface — it's the **promotion pipeline** between Experimental and Core, and it's arguably the most important signal for creative health.

---

### Visualization Critique

The current chart has **one genuine problem** and **one conceptual ambiguity** that makes it harder to read than it needs to be.

#### ❌ Problem: The Dashed Line Has an Identity Crisis

The dashed line oscillates between ~10–14 on the same Y-axis as the bars (which count formats, 0–20), but the "Output: 63" label at the far right suggests it's actually tracking **daily output volume** — which is a completely different unit (videos, not formats). These two signals **cannot share the same Y-axis** without being misleading.

What you're seeing is a dual-metric chart with a hidden secondary axis, which forces your eye to constantly re-calibrate what the dashed line means. At current scale (63 videos vs. 14 formats) it's tolerable, but as output volume grows to hundreds per day, the dashed line would either flatten into irrelevance or require rescaling — breaking the entire visual relationship.

#### ⚠️ Ambiguity: What Does the Dashed Line Actually Belong To?

The dashed line is likely the **daily output volume** (videos generated per day), pulled in to give context to the Diversity Ratio. But output volume is its own metric with its own dashboard. **This panel should not own that line.** The correct approach is one of two options:

| Option | What it looks like | When to use it |
|---|---|---|
| **Remove the line entirely** | Clean stacked bar only | If Output Volume has its own panel and both panels sit side-by-side |
| **Replace with Diversity Ratio trend** | Overlay the 7.4x metric as a *time series*, not a static KPI | If you want to see how concentration evolved as volume scaled |

The Diversity Ratio trend overlay is more valuable because it shows you the **dynamic**: did the ratio stay stable as you added formats, or did output concentrate faster than format breadth expanded?

---

### Proposed Simplified Layout

Instead of the current single-chart attempt to show three signals at once (format count, core/experimental split, output volume), I'd restructure into this:

```
┌─────────────────────────────────────────────────────┐
│  KPI Row: [Total Formats: 14]  [+9 New / 30d]  [Ratio: 7.4x ↓ healthy]
├────────────────────────────────┬────────────────────┤
│  MAIN: Stacked Bar             │  MINI: Ratio Trend │
│  Core (blue) + Exp (yellow)    │  Diversity Ratio   │
│  Daily active format count     │  over same window  │
│  → shows promotion visually    │  (line, no bars)   │
│    when yellow becomes blue    │                    │
└────────────────────────────────┴────────────────────┘
```

The main bar chart does one job: shows format diversity and the Core/Experimental split over time. The mini panel to the right shows the ratio trend. No shared Y-axis confusion. The output volume line is removed — it lives in the Output Volume Velocity panel next to this one.

---

### On the Correlation with Yield Efficiency

You're right that these two dashboards are meant to be read together, and here's the exact joint read:

| Signal combination | What it means |
|---|---|
| High Format Count + Low Diversity Ratio | ✅ Ideal — wide testing, volume distributed |
| Low Format Count + Low CPA on active templates | ⚠️ Efficient but fragile — you're cheap but not testing |
| High Format Count + High CPA on most templates | ⚠️ Testing many formats but most are expensive — validate and cut |
| Low Format Count + High CPA on those few | 🚨 You're paying premium for no creative optionality |

The joint question for both panels together is: **"Which formats are cheap enough to flood and diverse enough to test the market?"** — Yield Efficiency tells you the cost axis, Format Volume Velocity tells you the breadth axis. Neither is sufficient alone.

---

### One Definitional Gap Worth Closing

The concept doc defines Diversity Ratio as `Total Output ÷ Active Templates`, which gives **average videos per template**. But "Active" needs a time boundary — same 7/30/90 day window logic from Yield Efficiency applies here. A template that ran 3 months ago and hasn't been touched since shouldn't count as "active" in the denominator, or the ratio becomes artificially healthy by counting stale formats.

> **Recommended definition:** Active Template = a template that produced ≥ 1 successful output within the selected time window, subject to the same 10-generation minimum as Yield Efficiency if the ratio is being used for allocation decisions.


![[Pasted image 20260617132001.png]]

**Main panel (left):**
- Stacked bars — blue floor = Core Templates, gold top = Experimental
- Bars step up in 3 stages showing format injection events over 30 days
- Hover any bar → tooltip shows Core count, Experimental count, and total

**Mini panel (right):**
- Teal line: Diversity Ratio declining from ~88× down to 7.4× as format breadth expands
- Amber dashed line: "Healthy Threshold" at 20× — visually shows when you crossed into healthy territory
- The ratio drop is the key narrative: same period the bars are stepping up, the ratio is collapsing — those two signals together confirm the lab is working

**KPI row (top):**
- Added a 4th card: **Promotions (30d)** — tracks how many Experimental templates graduated to Core. This answers that third diagnostic question about creative pipeline health that the original mockup didn't surface at all.

You're right, and the reasoning is solid. Let me give you the precise breakdown of why the auto-threshold approach breaks down and what the toggle model should actually look like at the data model level.

---

## Why the Volume Threshold Fails as a Classification Rule

The core problem is that it confuses **production history** with **operational intent**. Those are different things.

A few concrete cases where the threshold misfires:

| Scenario | Videos produced | What the threshold says | What the operator actually knows |
|---|---|---|---|
| New format shows strong early CTR after 12 videos | 12 | Still Experimental | It's validated — scale it now |
| Old format ran 200 videos, market signal died | 200 | Firmly Core | It should be deprecated |
| Expensive Veo3 format, deliberately low-volume test | 8 | Experimental (correct) | But it's validated — just expensive to prove at volume |
| Cheap TTS format, ran 70 videos out of laziness | 70 | Auto-promoted to Core | It's actually junk, never tested properly |

The threshold doesn't know the *reason* the volume is what it is. Volume is a byproduct of decisions, not the decision itself.

---

## The Right Data Model

**Not a Boolean — an Enum.**

`is_core: bool` works at first glance, but you have a natural third state you'll need immediately: **Archived** (deprecated, retired, failed experiments). A boolean can't express that cleanly.

```
Template.status: enum
  └─ "experimental"   ← default on creation
  └─ "core"           ← operator promotes manually
  └─ "archived"       ← operator retires, excluded from dashboard
```

With a boolean you'd end up with two fields (`is_core`, `is_archived`) that can conflict. The enum keeps the state machine clean and mutually exclusive. Promotion path:

```
experimental → core → archived
experimental → archived  (failed, never validated)
```

---

## What the Toggle Actually Unlocks

Beyond just dashboard coloring, this field becomes a first-class operational control:

- **Dashboard filter:** Show only `core` in the stable floor (blue), show `experimental` in the test layer (gold), hide `archived` entirely
- **Volume allocation rules:** You might later build logic like "auto-allocate 70% of daily runs to `core` templates, 30% to `experimental`" — this field is the selector
- **Audit log:** Record who changed the status and when → this is exactly what feeds the **Promotions (30d)** KPI card on the dashboard

---

## The Complementary Signal (Without Removing Control)

Volume threshold shouldn't *classify* — but it can *notify*. The right pattern:

> When a template crosses **N generations in the current time window**, surface a nudge: *"Format X has hit 30 runs this week — ready to promote to Core?"*

Operator still makes the call. But you're not flying blind either. The threshold becomes a **suggestion trigger**, not an auto-state-change. This keeps operator intent sovereign while making sure high-volume experiments don't get forgotten in the Experimental category by accident.

---

**Bottom line:** `status: enum("experimental", "core", "archived")`, operator-controlled toggle in the UI, with a volume-based nudge as a passive signal. That's the model that stays accurate at any scale.


Yes. The status enum lives directly on the Template table as a new column.

```sql
ALTER TABLE templates
ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'experimental'
    CHECK (status IN ('experimental', 'core', 'archived'));
```

- **Default on creation:** `experimental` — every new template (including duplicates from Library Templates) starts as experimental automatically, no operator action required
- **Operator changes it** via UI toggle when promoting or retiring
- **Dashboard query effect:** `WHERE status != 'archived'` — archived templates are excluded from all metric panels entirely

So the two independent schema additions to the Template table from this entire conversation are:

```
templates
  + status                VARCHAR  DEFAULT 'experimental'   ← Format Volume Velocity
  + library_template_id   UUID     FK (nullable)            ← deferred, admin dashboard
```

No other tables touched.