# UX Test Flow Model

**Status:** Accepted (V1 + Canvas session edit)  
**Contracts:** `@audion-v3/contracts` — `UxTestFlow`, `UxFlowNode`, `UxFlowEdge`  
**Scenarios catalog:** `specs/domain/ux-test-flow-scenarios.md`  
**UI:** `/studies/flows` (template gallery + block list + React Flow canvas)

## Purpose

Product-facing **test flow** layer: few node kinds compose the ten canonical scenarios. End users pick a template and create a Study/Wave without editing code packs.

Scenario packs remain the execution seed shape. Flows **compile** into pack-like runs (V1). Mid-run agent branching is Phase 2.

## Node kinds

| Kind | Role |
|------|------|
| `start` | URL key / absolute URL, optional device, persona |
| `prompt` | Instruction or question to participant/agent |
| `observe` | Timed look-around without required click |
| `action` | Concrete UI goal (navigate, type, open filter) |
| `gate` | Conditional branch (`when` / `otherwise`) |
| `message` | Protocol note / system message (not product chrome) |
| `success` | Positive end |
| `abandon` | Honest stop + required explanation |
| `measure` | Soft scale / SEQ-like question |

## Edge kinds

| Kind | Meaning |
|------|---------|
| `then` | Default next step |
| `when` | Gate true branch (from `gate` node) |
| `otherwise` | Gate false branch |
| `parallel` | Sibling run (segment contrast); V1 may compile to multiple runs |

## Gate conditions (closed set)

| Id | Meaning | V1 compile |
|----|---------|------------|
| `frustration_high` | Self-report / perception frustration | Embed abandon instructions in task |
| `url_match` | `finalUrl` matches `pattern` | `successCriteria.url_match` |
| `title_match` | `finalTitle` matches `pattern` | `successCriteria.title_match` |
| `consent_accepted` | User confirmed external/privacy | Prompt + action text |
| `consent_rejected` | User declined | Abandon branch text |
| `goal_reached` | Task goal met | Soft successCriteria / task wording |
| `confusion_named` | Confusion explicitly named | Comprehension success path |
| `time_elapsed` | Observe window done | Prompt timing in task |

## Graph rules

1. Exactly one `start` node.
2. Every non-terminal node has ≥1 outgoing edge (`then` or gate pair).
3. `gate` must have one `when` and one `otherwise` edge.
4. Terminals: `success` | `abandon` (optional trailing `measure`).
5. No cycles in V1 templates.

## Compile (V1)

`compileUxTestFlowToPackShape(flow)` → `UxScenarioPack`-compatible object:

1. Walk default path: `start` → follow `then`; at `gate` follow `otherwise` (optimistic continue) **and** append `when`-branch instructions as “if … then abandon/explain”.
2. Concatenate `prompt` / `observe` / `action` / `message` texts into `task`.
3. First `url_match` / `title_match` on the graph → pack/run `successCriteria`.
4. `start.urlKey` → `targetUrlKey` and run `urlKey`.
5. Soft-Q keys: core profile (`ease`…`overall`) unless flow sets `domainProfileId`.
6. `parallel` edges from start → **additional runs** (same task; persona/segment from the parallel target node).

Phase 2: agent evaluates gates live and chooses edges.

## Canvas (session edit)

- Detail page: toggle **Liste | Canvas** (default Canvas when a full graph exists).
- Canvas uses `@xyflow/react`; node/edge payload is the same `UxTestFlow` JSON.
- Layout positions are UI-only (not persisted on `UxFlowNode`).
- Edits are **browser-session only**; **Reset to template** restores the fixture. Reload = fixture.
- Create Study may POST an inline `flow` snapshot; server validates then compiles (V1).
- All 10 catalog templates ship with full graphs (`compileReady`).

## In-flow live run (progress overlay)

- Canvas **Testen** creates a Study+Wave from the current snapshot, starts the wave (agent), and polls `GET /api/ux-journey-agent/run/{jobId}`.
- Node states overlay: `idle | active | done | skipped | error` (heuristic cursor on the default/`otherwise` path; URL/title gates advance when `finalUrl`/step targets match).
- Single-run cursor (run A); parallel persona runs are not dual-tracked in this slice.
- **Stop** best-effort cancels via agent cancel proxy.
- Live gates (agent chooses `when`/`otherwise` mid-run) remain Phase 2.

## Surfaces / API

| Surface | Role |
|---------|------|
| `GET /studies/flows` | Template gallery |
| `GET /studies/flows/[flowId]` | Block list + canvas + create CTA + in-flow Testen |
| `GET /api/studies/from-flow` | List summaries |
| `POST /api/studies/from-flow` | `{ flowId?, flow?, name?, projectId?, waveKey? }` → Study+Wave |
| `POST /api/studies/…/waves/…/start` | Start agent jobs for wave runs |
| `GET /api/ux-journey-agent/run/{jobId}` | Poll job status + partial steps |

`flowId` **or** `flow` required. If both, `flow` wins for the graph; `flowId` is id fallback when `flow.id` is missing.

## Out of scope (still later)

- DB-persisted user-edited flows  
- Agent mid-run gate engine  
- Moderated-only protocol UI without agent  
- Dual cursors for parallel runs
