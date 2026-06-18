# Research: AMPLIFY-417

## Overview

**Format / Template — Term Alignment & Tracking Decision**

**Terms.** Format and Template are formally distinct entities with different operational definitions at the system level. Format maps to the Library Template entity — the canonical graph structure, identified by `library_template_id` as the aggregation key. Template maps to the Workspace copy — a named instance of that format with its own parameter configuration, identified by `template.id` as the aggregation key. The two terms produce two different dashboard views over the same underlying job data.

**What defines a Format.** A format is defined by its graph topology — the node types and how they connect. Parameter changes (prompts, model settings, wording) do not produce a new format. Only a structural graph change (node added, removed, or rewired) constitutes a new format and warrants a new Library Template.

**Library Template vs. Workspace Template.** Library Templates are admin-controlled canonical definitions, read-only for users. When a user duplicates one, it becomes an independent Workspace Template with its own ID. Currently, the duplicate loses its reference to the parent Library Template. The fix is a nullable `library_template_id` FK on the Template table, populated at duplication time.

**Why the fix is required now.** Two categories of user-level dashboards exist, distinguished by aggregation key. Category 1 aggregates by `template.id` (instance granularity — already implemented). Category 2 aggregates by `library_template_id` within the same user's workspace (format granularity — collapses all instances of the same format). Category 2 requires the FK to be present. The fix is not deferred — it is an active schema requirement.

**A/B test on parameter level.** If an operator duplicates one format twice to test different model configurations, both instances appear as separate bars on the Category 1 dashboard under their own names. Disambiguation is handled by the operator renaming each instance after duplication — this workflow is already supported. On the Category 2 dashboard, both variants collapse into a single format bar. Both views are valid and serve different operational questions.

---

## Details

### Term Definitions

| Term | System entity | Aggregation key | Dashboard view |
|---|---|---|---|
| **Format** | Library Template | `library_template_id` | Per-format collapsed (Category 2) |
| **Template** | Workspace Template (user copy) | `template.id` | Per-instance granular (Category 1) |
| **Job** | One execution of a template | — | Raw data underlying both views |

The distinction matters at the data layer, not just linguistically:
- An operator thinks in **Formats** ("we need to test an ASMR Hook format") → Category 2 view
- The system executes a **Template** ("running graph ID `tpl_asmr_hook_v2`") → Category 1 view
- Both views query the same `jobs` table — only the GROUP BY key differs

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

This is an active requirement — not a future hygiene task. Category 2 dashboard aggregation depends on this FK being populated. If you don't store it at duplication time, retroactive reconstruction at scale is unreliable.

---

### Question 2: What is the canonical definition of a "Format"?

Based on the insight that *script is just a prompt which is just a parameter*, the answer falls out cleanly from first principles:

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

**Both — as two distinct dashboard categories, both user-scoped.**

| | Category 1 | Category 2 |
|---|---|---|
| **Aggregation key** | `template.id` | `library_template_id` |
| **Scope** | User's workspace | User's workspace |
| **Granularity** | Per instance | Per format (collapsed) |
| **A/B test view** | Separate bars (different names) | One bar (all variants merged) |
| **Question answered** | "How does this specific config perform?" | "How does this format perform overall?" |
| **Status** | Already implemented | Requires library_template_id FK fix |

Cross-user aggregation (all accounts running the same Library Template) remains a separate, future admin-level scope. Category 2 is strictly intra-user — it collapses a single user's template instances that share the same Library Template parent.

**Why Category 2 matters operationally.** At testing scale, a user may have 10+ workspace templates that are all instances of the same "ASMR Hook" format — each with different prompt configurations, model selections, or rate periods. Category 1 shows all 10 as separate bars (correct for A/B analysis). Category 2 collapses them into one "ASMR Hook" bar showing the aggregate format performance (correct for volume allocation decisions).

---

**Summary of the two aggregation modes:**

```
Category 1 (instance):  GROUP BY template.id
                        Display: template.name (operator-assigned)
                        A/B variants: separate bars
                        Use case: compare specific configurations

Category 2 (format):    GROUP BY library_template_id
                        Display: library_template.name
                        A/B variants: collapsed into one bar
                        Use case: format-level performance, volume allocation

Cross-user (admin):     GROUP BY library_template_id across all project_ids
                        Future scope — not implemented
```

---

### On Question 2 — Full alignment.

The mapping is clean: **graph topology change → new format → new Library Template.** The fact that two graphs might abstractly represent "the same creative concept" is irrelevant to the system. The system doesn't know about abstract intent — it knows about nodes and edges. This also eliminates any judgment call about "how different is different enough." The rule is binary and unambiguous.

---

### On Question 3 — A/B test disambiguation.

Two bars with identical labels on the same Category 1 chart is a UX dead-end. The fix falls naturally from the data model: **the Template instance carries its own name, set by the operator at duplication time.**

When the user duplicates "ASMR Hook" for an A/B test, they name the instances themselves:

```
Library Template:  "ASMR Hook"
  ├─ Template A:   "ASMR Hook · Veo3"       ← operator names this
  └─ Template B:   "ASMR Hook · Veo2 ctrl"  ← operator names this
```

**Category 1 dashboard shows:**

| Bar | CPA | Parent Format |
|---|---|---|
| ASMR Hook · Veo3 | $2.10 | ↖ ASMR Hook |
| ASMR Hook · Veo2 ctrl | $0.85 | ↖ ASMR Hook |

**Category 2 dashboard shows:**

| Bar | CPA (blended) | Instance count |
|---|---|---|
| ASMR Hook | $1.47 | 2 templates · N jobs |

No new UI or query changes needed for disambiguation — renaming is already supported. The `library_template_id` FK drives the Category 2 collapse automatically.

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

Confirmed. Template name is already editable → operator renames after duplication → name encodes the tested parameter → Category 1 dashboard shows them as separate data points automatically. Zero new code.

---

### The SQL

**Category 1 — Yield Efficiency (CPA per template instance):**

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
    AND j.finished_at >= NOW() - INTERVAL '30 days'
GROUP BY
    t.id, t.name, lt.name
HAVING
    COUNT(j.id) >= 10
ORDER BY
    avg_cpa ASC;
```

**Category 2 — Yield Efficiency (CPA per format, collapsed):**

```sql
SELECT
    lt.id,
    lt.name                             AS format_name,
    COUNT(DISTINCT t.id)                AS template_instance_count,
    COUNT(j.id)                         AS job_count,
    SUM(j.cost_usd)                     AS total_spend,
    SUM(j.cost_usd) / COUNT(j.id)       AS avg_cpa
FROM library_templates lt
JOIN templates t ON t.library_template_id = lt.id
    AND t.project_id = :project_id
JOIN jobs j ON j.template_id = t.id
WHERE
    j.status      = 'success'
    AND j.finished_at >= NOW() - INTERVAL '30 days'
GROUP BY
    lt.id, lt.name
HAVING
    COUNT(j.id) >= 10
ORDER BY
    avg_cpa ASC;
```

**Category 1 — Generation Velocity (per template instance):**

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

Category 1 groups by `t.id` → two separate rows → two separate bars.
Category 2 groups by `lt.id` → one row → one collapsed bar showing blended performance.
The operator chooses which view to consult depending on the question being asked.

---

**Final schema summary — two independent additions to the Template table:**

```
templates
  + status                VARCHAR  DEFAULT 'experimental'   ← Format Volume Velocity (Core/Experimental/Archived)
  + library_template_id   UUID     FK (nullable)            ← active requirement, enables Category 2 dashboard
```

**What needs to happen:**

```
1. Schema:    Add library_template_id FK to templates table. Populate on duplication. Required now.
2. Query:     Category 1 → GROUP BY template.id. Category 2 → GROUP BY library_template_id.
3. UX:        Nothing new. Renaming already encodes A/B test identity for Category 1 disambiguation.
4. Admin:     Cross-user aggregation (same GROUP BY library_template_id, no project_id filter) — future scope.
```