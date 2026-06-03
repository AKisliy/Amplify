---
trigger: always_on
---

# Amplify Wiki — Schema

## Purpose

The Amplify Wiki is a Git-tracked, LLM-maintained knowledge base that lives alongside the
codebase on the same feature branches. It solves four problems in the standard GitHub workflow:

- Plans are invisible to teammates until the PR opens
- Agents rediscover repository structure on every session
- Implementation deviations from the plan are undocumented
- Architectural reasoning evaporates after a PR merges

---

## Directory Structure

```
wiki/
├── CLAUDE.md                    ← This file. Schema and initialization contract.
├── issues/
│   ├── index.md                 ← Global index: one row per issue
│   └── AMPLIFY-N/               ← Per-issue knowledge base (matches branch AMPLIFY-N)
│       ├── raw/                 ← Immutable source documents. Agent reads; never writes.
│       ├── concepts/            ← One file per concept. Agent-written during ingest.
│       ├── plan.md              ← Alignment artifact. Frozen before implementation begins.
│       ├── research.md          ← Overview, running synthesis, index of concepts.
│       ├── decisions.md         ← Runtime deviations from plan.md during implementation.
│       └── log.md               ← Append-only session log.
└── context/                     ← [Deferred] Repo-wide architectural context
    ├── architecture.md
    ├── CONTEXT.md
    ├── layers/
    └── adr/
```

---

## Session Initialization

At the start of every session, read in this order:

1. `wiki/CLAUDE.md` (this file)
2. `wiki/issues/index.md`
3. `wiki/issues/AMPLIFY-N/plan.md` for the issue currently being worked on
4. `wiki/issues/AMPLIFY-N/research.md` for current state of knowledge

If `wiki/context/` exists, also read:
- `wiki/context/architecture.md`
- `wiki/context/CONTEXT.md`
- The relevant layer file from `wiki/context/layers/`

Do not pre-load concept files. Load them on demand as specific concepts become relevant.

---

## Active Issue Scope

Every session operates within exactly one active issue. All file writes are confined to that
issue's folder: `wiki/issues/AMPLIFY-N/`.

| Location | Access |
|----------|--------|
| `wiki/issues/AMPLIFY-N/` (active issue) | Read + Write |
| `wiki/issues/index.md` | Write allowed (plan committed or PR merged) |
| `wiki/issues/<any other issue>/` | Read-only — never modify |
| `wiki/CLAUDE.md` | Read-only during sessions |
| `wiki/context/` | Write only when architecture changes (see Maintenance Rules) |

**If the active issue is not established**, ask the user before writing anything:
> "Which issue are we working on? I need the issue number before I write any files."

Concept files, log entries, research updates — everything goes inside `wiki/issues/AMPLIFY-N/`
for the active issue. Never write into another issue's folder.

---

## Operations

### Ingest

Triggered explicitly — the user points to one or more files in `raw/`.

1. Read the specified raw source(s). If images are present and the user has requested image ingestion, view them.
2. Identify the concepts present in the source.
3. For each concept, decide:
   - **Create a new concept file** in `concepts/` if the concept is non-trivial, self-contained, and likely to be referenced by future sessions or the implementation agent.
   - **Update an existing concept file** if the source adds new information to an already-documented concept.
   - **Extend `research.md` directly** if the finding is a minor data point or cross-cutting observation that does not belong to a single concept.
4. Add backlinks: `research.md` links into concept files with `[[concepts/concept-name]]`; concept files link to related concepts where relevant.
6. Update the concepts index in `research.md`.
7. Update the running Overview in `research.md`.
8. Never modify files in `raw/`.
9. Append a one-line entry to `log.md`.

### Query

Answer questions using `research.md` and the relevant concept files as primary sources.

1. Read `research.md` to orient — find which concepts are relevant.
2. Load only the concept files needed to answer the question.
3. Synthesize an answer with citations to specific sections.
4. If the answer adds new knowledge, offer to file it back into the appropriate concept file or `research.md`.

### Lint (informal, on request)

Health-check the current issue wiki:

- Any files in `raw/` not yet reflected in any concept file or `research.md`?
- Any concepts mentioned in `research.md` that lack their own file but should have one?
- Any broken backlinks?
- Any contradictions between concept files?
- Any acceptance criteria in `plan.md` not yet addressed (during implementation)?
- Any known implementation divergences not captured in `decisions.md`?

---

## File Templates

Only `plan.md` has a fixed structure. All other files are shaped by their content.

### plan.md

```markdown
# AMPLIFY-N: [Short description]

## Goal
[One sentence: what this issue delivers]

## Context
[Relevant architectural facts, affected layers, key components — describe roles, not file paths]

## Design Decisions
[Key choices made during the planning session with rationale]

## Acceptance Criteria
- [ ] [Criterion 1]
- [ ] [Criterion 2]

## Out of Scope
[Explicitly excluded work, with pointers to related issues if applicable]
```

### research.md

```markdown
# Research: AMPLIFY-N

## Overview
[Running synthesis — updated with each ingest]

## Concepts
| Concept | Summary |
|---------|---------|
| [[concepts/name]] | [One-line description] |

## Open Questions
[Cross-cutting questions not yet resolved. Removed when answered.]
```

### decisions.md

```markdown
# Decisions: AMPLIFY-N

> Populated during implementation. Each entry records a deviation from plan.md.
> Updated inline as deviations happen — not retroactively at PR time.

<!-- ## [YYYY-MM-DD] [Short title]
**What changed:** ...
**Why:** ...
**Impact on plan.md:** ... -->
```

### log.md

```markdown
# Log: AMPLIFY-N

## [YYYY-MM-DD]
[One-line summary of what happened in this session]
```

---

## Maintenance Rules

1. **`raw/` is read-only for the agent.** Never write, modify, or delete files in `raw/`.
2. **Ingest is always explicit.** Only process sources the user points to.
3. **Backlinks are mandatory.** `research.md` must link to every concept file. Concept files link to related concepts.
4. **All writes are scoped to the active issue folder.** See Active Issue Scope above.
5. **`plan.md` is frozen after implementation begins.** It is a permanent snapshot of pre-implementation intent.
6. **`decisions.md` is updated inline during implementation** — not retroactively at PR time.
7. **`log.md` is append-only.** Never edit or remove existing entries. Only the active issue's `log.md` is touched.
8. **`wiki/issues/index.md` is updated** when a plan is committed and when a PR merges.
9. **`context/` files are agent-maintained** (when the context layer exists). Any session that changes architecture updates the relevant file in the same commit.
