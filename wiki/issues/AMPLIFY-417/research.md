# Research: AMPLIFY-417

## Overview

**Format / Template — Term Alignment & Tracking Decision**

**Terms.** "Format" and "Template" refer to the same entity. Format is used in creative and business context; Template is the technical term for the same object in the system. One-to-one mapping, no distinction at the data level.

**What defines a Format.** A format is defined by its graph topology — the node types and how they connect. Parameter changes (prompts, model settings, wording) do not produce a new format. Only a structural graph change (node added, removed, or rewired) constitutes a new format and warrants a new Library Template.

**Library Template vs. Workspace Template.** Library Templates are admin-controlled canonical definitions, read-only for users. When a user duplicates one, it becomes an independent Workspace Template with its own ID. Currently, the duplicate loses its reference to the parent Library Template. The fix is a nullable `library_template_id` FK on the Template table, populated at duplication time.

**Why the fix is deferred.** User-level dashboards aggregate at Workspace Template level using the template's own name as the display label. This already works correctly without the parent reference. The `library_template_id` is only required for a future admin-level cross-account dashboard. It is flagged for addition before that scope opens — reconstructing lineage retroactively at scale is unreliable.

**A/B test on parameter level.** If an operator duplicates one format twice to test different model configurations, both instances appear as separate bars on the dashboard under their own names. No aggregation is forced. Disambiguation is handled by the operator renaming each instance after duplication — this workflow is already supported. No UI or query changes needed.

## Detials

| Term | What it actually is |
|---|---|
| **Template** | The technical artifact — a node graph in Amplify (e.g., a ComfyUI/ReactFlow graph connecting a Veo3 node → ElevenLabs node → output) |
| **Format** | The creative/business concept — the content type that template produces (e.g., "ASMR Hook", "Testimonial", "Unboxing") |

The relationship the concept doc states explicitly: *"each Template automates a specific content format."* So the mapping is **1 Template → 1 Format**, always.

In practice for the metrics this means:
- **Generation Velocity** measures the Template (it reads `started_at` / `finished_at` from the job, which is tied to a specific template graph execution)
- **Format Volume Velocity** talks about Format because it's framing the same data from the creative/business angle — how many distinct creative angles are being tested

The distinction matters more operationally than metrically:
- An operator thinks in **Formats** ("we need to test an ASMR Hook format")
- The system executes a **Template** ("running graph ID `tpl_asmr_hook_v2`")
- The dashboard can use either term depending on audience — operators see Format names, engineers see Template IDs

So in the dashboards I built, "Format" and "Template" are functionally the same unit of measurement. The naming just depends on which layer you're speaking from.

---

This is a well-scoped system design problem. Let me cut through it precisely.

---

## The Actual Ambiguity: Three Tangled Questions

You've identified one symptom (lost parent reference) but it's caused by three distinct questions that need separate answers before implementation.

---

### Question 1: Is the lost parent reference a bug?

**Yes, it is a bug. Fix it unconditionally.**

When a user duplicates a Library Template, the resulting Template entity should carry a `library_template_id` foreign key pointing back to its origin. Nullable for templates created from scratch, populated on duplication. This is a one-line schema change:

```
Template
  id                    UUID  PK
  library_template_id   UUID  FK → LibraryTemplate (nullable)
  project_id            UUID  FK → Project
  parameters            JSONB
  ...
```

You don't need to aggregate by it today. But if you don't store it, you permanently lose the lineage and can never answer format-level questions across users. The cost of fixing it now is near zero. The cost of reconstructing it later is very high.

---

### Question 2: What is the canonical definition of a "Format"?

Based on your reasoning — and the insight that *script is just a prompt which is just a parameter* — the answer falls out cleanly from first principles:

| Entity | Defines |
|---|---|
| **Library Template** | The graph structure — which node types exist and how they connect |
| **Template** (user copy) | A named instance of that structure with specific parameter configuration |
| **Job** | One execution of that template instance |

**A Format = a graph structure = a Library Template.**

Variation in hook wording, script style, surface-level prompts → these are parameter changes on the same Template instance. They do not constitute a new Format. The graph structure didn't change.

The threshold for "this is a new Format" is: **did a node type change, was a node added/removed, or did the execution graph topology change?** If yes → new Library Template. If no → same format, different parameter configuration.

This is the clean rule that eliminates the ambiguity about variation degrees.

---

### Question 3: Should metrics aggregate at the Library Template level or the Template (instance) level?

This is the operational question, and the answer is:

**User dashboard → Template instance level. Admin view → Library Template level.**

Here's why. Metrics are on user-level dashboards only (as you stated). A user cares about *their specific configuration* of the format:
- Their prompt tuning
- Their preset choices
- Their parameter decisions

Two users running the same Library Template with different parameters will have legitimately different CPAs and generation velocities. Aggregating their metrics together would produce a meaningless average that neither user should make decisions from.

The parent reference (`library_template_id`) serves two purposes that are *not* aggregation:
1. **Display label** — the dashboard can show "ASMR Hook (based on Library)" instead of an opaque UUID, making the UI readable
2. **Admin-level cross-account view** — future feature, not user dashboard, aggregates performance of a Library Template across all accounts using it

---

## The Resolution

```
Three decisions, each independent:

1. FIX:    Add library_template_id FK to Template on duplication. Do this now.

2. DEFINE: Format = Library Template (graph structure).
           Variation = parameter on Template instance.
           No new Library Template unless topology changes.

3. SCOPE:  User dashboard metrics → aggregate at Template (instance) level.
           Library Template label → shown for readability, not aggregation.
           Cross-user aggregation → admin view, future scope.
```

The system you described isn't more complex than what you have — it just needs the parent reference restored and the Format/Template boundary made explicit in the data model. The Library Template's only job, as you said, is to save time on graph construction. Once duplicated, the user's instance owns its own metrics, its own parameters, and its own identity. The lineage is informational, not operational.

---

### On Question 2 — Yes, full alignment.

The mapping is clean: **graph topology change → new format → new Library Template.** The fact that two graphs might abstractly represent "the same creative concept" is irrelevant to the system. The system doesn't know about abstract intent — it knows about nodes and edges. This also eliminates any judgment call about "how different is different enough." The rule is binary and unambiguous.

---

### On Question 3 — Your instinct is right, but there's one practical problem with the "two bars, same name" approach.

Two bars with identical labels on the same chart is a UX dead-end. The user stares at two "ASMR Hook" bars and has no way to know which is the Veo3 run vs the Veo2 run, or which parameters distinguish them. You don't lose data, but you lose actionability — which defeats the point of the dashboard.

The fix is minimal and falls naturally from the data model: **the Template instance carries its own name, set by the operator at duplication time.**

When the user duplicates "ASMR Hook" for an A/B test, they name the instances themselves:

```
Library Template:  "ASMR Hook"
  └─ Template A:   "ASMR Hook · Veo3"       ← operator names this
  └─ Template B:   "ASMR Hook · Veo2 ctrl"  ← operator names this
```

The dashboard then shows:

| Bar | CPA | Parent |
|---|---|---|
| ASMR Hook · Veo3 | $2.10 | ↖ ASMR Hook |
| ASMR Hook · Veo2 ctrl | $0.85 | ↖ ASMR Hook |

- **No forced aggregation** — each instance keeps its own CPA, its own generation velocity, its own bar
- **No lost information** — the rate difference is preserved exactly as you said
- **Disambiguation** — comes from operator naming convention, not system-generated suffixes
- **Lineage visible** — the parent Library Template label shown as a light annotation, not a grouping

The `library_template_id` reference (the bug fix from Q1) enables that "↖ ASMR Hook" annotation without driving any aggregation logic.

---

**Summary of the settled model:**

```
Aggregation unit on user dashboard  →  Template instance (user's named copy)
Parent reference                    →  display-only lineage, never aggregated
A/B variants                        →  separate bars, operator-named, no merging
Aggregation trigger                 →  only if operator explicitly names instances identically
                                       (then it's their choice, not a system assumption)
```

The system defaults to maximum granularity and lets the operator collapse by naming convention. That's the right default.

---

Your understanding is correct on all three points. Let me confirm each and then show you what the SQL actually looks like — which resolves the "I'm still confused" part.

---

### Bug Fix: ID is correct, store name is wrong

Storing the Library Template **name** in the column would be denormalization. If admin ever renames the Library Template later, all workspace copies carry stale data and there's no clean way to update them. Store the **ID**, pay the cost of one JOIN — it's indexed on PK, negligible.

```sql
-- The fix: one new nullable column on the workspace template table
ALTER TABLE templates
ADD COLUMN library_template_id UUID REFERENCES library_templates(id) ON DELETE SET NULL;
```

Populated at duplication time, never touched again.

---

### A/B Test: Nothing new needed

Confirmed. Template name is already editable → operator renames after duplication → name encodes the tested parameter → dashboard shows them as separate data points automatically. Zero new code.

---

### The SQL — this is the part you were circling around

The dashboard query aggregates at **`template_id` level**, never at `library_template_id` level. The parent reference just comes along for the annotation label.

**Yield Efficiency (CPA by template):**

```sql
SELECT
    t.id,
    t.name                              AS template_name,
    lt.name                             AS parent_format,        -- annotation only
    COUNT(j.id)                         AS job_count,
    SUM(j.cost_usd)                     AS total_spend,
    SUM(j.cost_usd) / COUNT(j.id)       AS avg_cpa
FROM templates t
LEFT JOIN library_templates lt ON lt.id = t.library_template_id
JOIN jobs j ON j.template_id = t.id
WHERE
    j.project_id   = :project_id
    AND j.status   = 'success'
    AND j.finished_at >= NOW() - INTERVAL '30 days'  -- time window
GROUP BY
    t.id, t.name, lt.name
HAVING
    COUNT(j.id) >= 10                                -- minimum threshold
ORDER BY
    avg_cpa ASC;
```

**Generation Velocity:**

```sql
SELECT
    t.id,
    t.name,
    AVG(EXTRACT(EPOCH FROM (j.finished_at - j.started_at)) / 60)  AS avg_minutes
FROM templates t
JOIN jobs j ON j.template_id = t.id
WHERE
    j.project_id  = :project_id
    AND j.status  = 'success'
    AND j.finished_at >= NOW() - INTERVAL '30 days'
GROUP BY
    t.id, t.name
HAVING
    COUNT(j.id) >= 10
ORDER BY
    avg_minutes ASC;
```

---

### Why the A/B case resolves itself from the query

```
Template A  "ASMR Hook · Veo3"   id=uuid-A   library_template_id=uuid-lib
Template B  "ASMR Hook · Veo2"   id=uuid-B   library_template_id=uuid-lib
```

Query groups by `t.id` → two separate rows → two separate bars. The shared `library_template_id` doesn't collapse them. If you ever want admin-level aggregation across all users running the same Library Template, the only change is swapping `GROUP BY t.id, t.name` for `GROUP BY lt.id, lt.name`. The data model supports both without schema changes.

---

**The three-line summary of what needs to happen:**

```
1. Schema:    Add library_template_id FK to templates table. Populate on duplication.
2. Query:     Always GROUP BY template.id — parent ID is SELECT-only for display.
3. UX:        Nothing new. Renaming already encodes A/B test identity.
```

---

Exactly right. You just closed the loop cleanly.

Current dashboards: **no changes.** They already aggregate by `template.id` with `template.name` as the display label. That's the correct behavior and it's already implemented.

`library_template_id` has exactly **one use case**: admin-level cross-account aggregation. Since that dashboard doesn't exist yet, it's not a bug in the current system — it's a missing column for a future feature.

---

The only honest argument for adding it **now** despite no current requirement:

> Once you have thousands of workspace templates in production with no parent reference, reconstructing which ones came from which Library Template is **impossible** — you'd have to infer it from name matching or creation timestamps, both of which are unreliable.

It's a 5-minute migration and one line on the duplication handler. The cost of adding it later could be a lot higher depending on data volume. So it's a **forward-looking data hygiene decision**, not a current functional fix.

But if the admin dashboard is not on the near-term roadmap, it's a valid call to defer it — just flag it explicitly so it doesn't get forgotten when that scope opens.

```
Current scope:   No dashboard changes. No schema changes required.
Deferred:        library_template_id column — add before admin dashboard scope opens.
Risk if deferred: Lineage reconstruction becomes unreliable at scale.
```