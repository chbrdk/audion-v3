# UX Test Flow Model

**Status:** Accepted (V1 + Canvas session edit + Live-Gate signals + saved flows)  
**Contracts:** `@audion-v3/contracts` — `UxTestFlow`, `UxFlowNode`, `UxFlowEdge`, `UxSavedFlow*`  
**Scenarios catalog:** `specs/domain/ux-test-flow-scenarios.md`  
**UI:** `/studies/flows` (template gallery + block list + React Flow canvas)

## Purpose

Product-facing **test flow** layer: few node kinds compose the ten canonical scenarios. End users pick a template and create a Study/Wave without editing code packs.

Scenario packs remain the execution seed shape. Flows **compile** into pack-like runs (V1). Mid-run agent branching chooses edges when Live-Gate signals exist (Phase 2 slice); full agent-driven branch engine remains deferred.

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

| Id | Meaning | V1 compile | Live-Gate (Phase 2 slice) |
|----|---------|------------|---------------------------|
| `frustration_high` | Self-report / perception frustration | Embed abandon instructions in task | Agent `gateSignals.frustrationHigh` from perception stance/confusion |
| `url_match` | `finalUrl` matches `pattern` | `successCriteria.url_match` | Agent `gateSignals.finalUrl` (+ canvas pattern match) |
| `title_match` | `finalTitle` matches `pattern` | `successCriteria.title_match` | Agent `gateSignals.finalTitle` (+ canvas pattern match) |
| `consent_accepted` | User confirmed external/privacy | Prompt + action text | Deferred |
| `consent_rejected` | User declined | Abandon branch text | Deferred |
| `goal_reached` | Task goal met | Soft successCriteria / task wording | Deferred (end-of-run success only) |
| `confusion_named` | Confusion explicitly named | Comprehension success path | Soft: `gateSignals.confusionNamed` |
| `time_elapsed` | Observe window done | Prompt timing in task | Deferred |

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

## Canvas (session edit + persist)

- Detail page: toggle **Liste | Canvas** (default Canvas when a full graph exists).
- Canvas uses `@xyflow/react`; node/edge payload is the same `UxTestFlow` JSON.
- Layout positions are UI-only (not persisted on `UxFlowNode`).
- **Save** persists the session snapshot via fixture/native store (`ux-flow-store`) keyed by template `flowId` (or saved id). **Reset to template** restores the catalog fixture. Reload prefers saved variant when present.
- Create Study may POST an inline `flow` snapshot; server validates then compiles (V1).
- All 10 catalog templates ship with full graphs (`compileReady`).
- **Undo** keeps a short in-session history stack (last N graph snapshots).
- Theming: node/viewport/run-strip chrome uses CSS variables (`--flow-*` + Audion tokens) so **light and dark** themes both look intentional.

## In-flow live run (progress overlay)

- Canvas **Testen** creates a Study+Wave from the current snapshot, starts the wave (agent), and polls `GET /api/ux-journey-agent/run/{jobId}`.
- Node states overlay: `idle | active | done | skipped | error`.
- **Inline node output:** active/done/error nodes render the latest mapped agent step (action/target headline, result/think-aloud text, screenshot via BFF proxy).
- Progress mapper (`ux-flow-run-progress.ts`) preference order:
  1. Optional poll `flowCursor` / `gateEvaluations` when present.
  2. Else evaluate flow gates against agent `gateSignals` (`finalUrl`, `finalTitle`, `frustrationHigh`, `confusionNamed`) + step targets.
  3. Else heuristic step-budget cursor on the default/`otherwise` path.
- **Parallel runs:** when start returns multiple real `jobId`s, canvas tracks run A/B (segment contrast) without changing single-run UX.
- **Stop** best-effort cancels via agent cancel proxy.
- Live viewport thumb stays secondary to the graph (slightly larger than V1).

### Live-Gate signals (agent)

`GET /run/{jobId}` may include:

```json
{
  "gateSignals": {
    "finalUrl": "https://…",
    "finalTitle": "…",
    "frustrationHigh": false,
    "confusionNamed": false,
    "evaluatedAt": "ISO-8601"
  },
  "flowCursor": {
    "activeEdgeKind": "when|otherwise|then|null",
    "gateEvaluations": [
      { "condition": "url_match", "matched": true, "evidence": "…" }
    ]
  }
}
```

`flowCursor` is optional; when omitted, the web mapper derives gate outcomes from `gateSignals` + the flow graph. Agent does **not** yet replan the browser task mid-run when a gate fires (deferred).

## Surfaces / API

| Surface | Role |
|---------|------|
| `GET /studies/flows` | Template gallery |
| `GET /studies/flows/[flowId]` | Block list + canvas + create CTA + in-flow Testen |
| `GET /api/studies/from-flow` | List catalog summaries |
| `POST /api/studies/from-flow` | `{ flowId?, flow?, name?, projectId?, waveKey? }` → Study+Wave |
| `GET /api/studies/flows/saved` | List saved user flow snapshots |
| `GET /api/studies/flows/saved/[id]` | Get one saved snapshot |
| `POST /api/studies/flows/saved` | Upsert saved snapshot (`templateFlowId` + `flow`) |
| `POST /api/studies/…/waves/…/start` | Start agent jobs for wave runs |
| `GET /api/ux-journey-agent/run/{jobId}` | Poll job status + partial steps + gateSignals |

`flowId` **or** `flow` required for create. If both, `flow` wins for the graph; `flowId` is id fallback when `flow.id` is missing.

Persistence: same fixture/native pattern as studies (`ux-flow-store`). No dedicated Postgres table in this slice — in-memory (+ optional process lifetime) until a schema is added.

## Out of scope (still later)

- Agent mid-run **replanning** / task rewrite when a gate fires  
- Live evaluation for consent / goal_reached / time_elapsed  
- Postgres-backed `ux_saved_flows` table  
- Moderated-only protocol UI without agent  
