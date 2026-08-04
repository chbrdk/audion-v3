# UX Test Flow Model

**Status:** Accepted (V1 + Canvas + Live-Gates + Phase 3: mid-run replan, Postgres saved flows, moderated protocol)  
**Contracts:** `@audion-v3/contracts` — `UxTestFlow`, `UxFlowNode`, `UxFlowEdge`, `UxSavedFlow*`, `UxFlowGateSignalBundle`, `UxFlowCursor`, `UxFlowReplanEvent`  
**Scenarios catalog:** `specs/domain/ux-test-flow-scenarios.md`  
**UI:** `/studies/flows` (template gallery + block list + React Flow canvas + moderated protocol)

## Purpose

Product-facing **test flow** layer: few node kinds compose the ten canonical scenarios. End users pick a template and create a Study/Wave without editing code packs.

Scenario packs remain the execution seed shape. Flows **compile** into pack-like runs (V1). Live-Gate signals drive canvas branch selection; Phase 3 also **replans the agent mid-run** when a gate fires (remaining branch task via `add_new_task`). Full multi-gate planner / parallel mid-run orchestration remains deferred.

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

| Id | Meaning | V1 compile | Live-Gate | Mid-run replan (Phase 3) |
|----|---------|------------|-----------|--------------------------|
| `frustration_high` | Self-report / perception frustration | Embed abandon instructions in task | `gateSignals.frustrationHigh` | Replan onto `when` remaining task once |
| `url_match` | `finalUrl` matches `pattern` | `successCriteria.url_match` | `gateSignals.finalUrl` + pattern | Same |
| `title_match` | `finalTitle` matches `pattern` | `successCriteria.title_match` | `gateSignals.finalTitle` + pattern | Same |
| `consent_accepted` | User confirmed external/privacy | Prompt + action text | `gateSignals.consentAccepted` | Same |
| `consent_rejected` | User declined | Abandon branch text | `gateSignals.consentRejected` | Same |
| `goal_reached` | Task goal met | Soft successCriteria / task wording | `gateSignals.goalReached` | Same |
| `confusion_named` | Confusion explicitly named | Comprehension success path | `gateSignals.confusionNamed` | Same |
| `time_elapsed` | Observe window done | Prompt timing in task | `elapsedSeconds` vs `observeSeconds` | Same |

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
7. Each wave run may carry `flowGraph` (nodes+edges snapshot) so the agent can evaluate Live-Gates mid-run.

## Canvas (session edit + persist)

- Detail page: toggle **Liste | Canvas | Protokoll** (default Canvas when a full graph exists).
- Canvas uses `@xyflow/react`; node/edge payload is the same `UxTestFlow` JSON.
- Layout positions are UI-only (not persisted on `UxFlowNode`).
- **Save** persists the session snapshot via `ux-flow-store` → Postgres `ux_saved_flows` when `DATABASE_URL` is set; otherwise in-memory. Keyed by template `flowId` (or saved id). **Reset to template** restores the catalog fixture. Reload prefers saved variant when present.
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
  2. Else evaluate flow gates against agent `gateSignals` (`finalUrl`, `finalTitle`, `frustrationHigh`, `confusionNamed`, consent/goal/elapsed) + step targets.
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
    "consentAccepted": false,
    "consentRejected": false,
    "goalReached": false,
    "elapsedSeconds": 42,
    "evaluatedAt": "ISO-8601"
  },
  "flowCursor": {
    "activeNodeId": "n-feel-gate",
    "activeEdgeKind": "when|otherwise|then|null",
    "gateEvaluations": [
      { "condition": "url_match", "matched": true, "evidence": "…", "gateNodeId": "n-url" }
    ],
    "replan": {
      "gateNodeId": "n-feel-gate",
      "edgeKind": "when",
      "condition": "frustration_high",
      "remainingTask": "…",
      "at": "ISO-8601"
    }
  }
}
```

`flowCursor` is optional; when omitted, the web mapper derives gate outcomes from `gateSignals` + the flow graph.

### Mid-run agent replan (Phase 3)

When `POST /run` includes optional `flow_graph` (`{ id, nodes, edges }`):

1. Agent stores the graph on the job and evaluates it after each partial-steps publish (same closed-set conditions as the canvas mapper).
2. On the **first** matching gate on the default path, agent builds the remaining **`when`-branch** task text (node labels/texts along that branch) and calls `agent.add_new_task(remainingTask)` once per gate id.
3. Poll payload includes `flowCursor.replan` + `activeEdgeKind: "when"` so the canvas stays aligned.
4. No second product model — same `UxTestFlow` graph + existing `gateSignals` / `flowCursor`.

Wave Start passes `flowGraph` from each `UxWaveRunItem` when present (set at Study-from-Flow create).

## Moderated-only protocol (Phase 3)

- View **Protokoll** on `/studies/flows/[flowId]` (and via `?view=protocol`).
- Human moderator walks the same graph **without** calling the journey agent:
  - Default/`otherwise` path as checklist steps.
  - At gates: moderator chooses **wenn** / **sonst** (branches remaining path).
  - Per step: notes + optional measure score; Done / Skip / Back.
  - Session stays in-browser (exportable summary text); no agent job.
- Same flow model; mode flag conceptually `moderated_outline` (scenario 10) but any compile-ready flow can run as protocol.

## Surfaces / API

| Surface | Role |
|---------|------|
| `GET /studies/flows` | Template gallery |
| `GET /studies/flows/[flowId]` | Block list + canvas + protocol + create CTA + in-flow Testen |
| `GET /api/studies/from-flow` | List catalog summaries |
| `POST /api/studies/from-flow` | `{ flowId?, flow?, name?, projectId?, waveKey? }` → Study+Wave (+ `flowGraph` on runs) |
| `GET /api/studies/flows/saved` | List saved user flow snapshots |
| `GET /api/studies/flows/saved/[id]` | Get one saved snapshot |
| `POST /api/studies/flows/saved` | Upsert saved snapshot (`templateFlowId` + `flow`) |
| `DELETE /api/studies/flows/saved/[id]` | Delete saved snapshot |
| `POST /api/studies/…/waves/…/start` | Start agent jobs for wave runs (forwards `flow_graph`) |
| `GET /api/ux-journey-agent/run/{jobId}` | Poll job status + partial steps + gateSignals + flowCursor |

`flowId` **or** `flow` required for create. If both, `flow` wins for the graph; `flowId` is id fallback when `flow.id` is missing.

### Persistence — `ux_saved_flows`

| Column | Type | Notes |
|--------|------|-------|
| `id` | text PK | `saved-…` |
| `template_flow_id` | text | Catalog template id |
| `name` | text | Display name |
| `flow` | jsonb | Full `UxTestFlow` snapshot |
| `created_at` / `updated_at` | timestamptz | |

Facade: `apps/web/lib/fixtures/ux-flow-store.ts` — Postgres when `DATABASE_URL` set, else in-memory (tests/local). API surface unchanged.

## Phase plan

| Phase | Shipped | Deferred |
|-------|---------|----------|
| V1 | Templates, compile, canvas edit, Study create | — |
| Phase 2 | Live-Gate signals (url/title/frustration/consent/goal/time), canvas branch, fixture saved flows | Mid-run replan, Postgres, moderated UI |
| **Phase 3 (this slice)** | Mid-run replan on gate fire, `ux_saved_flows` Postgres, moderated protocol view | Multi-gate sequential replan beyond first match; collaborative multi-user saved-flow ACLs; agent-driven protocol (hybrid moderated+agent mid-session); full branch planner replacing V1 compile embedding |

## Out of scope (still later)

- Multi-gate sequential replan chain beyond the first matched gate on the default path  
- Collaborative / ACL-scoped saved flows across orgs  
- Hybrid session: human protocol steps interleaved with live agent actions in one job  
- Full agent-native branch engine replacing V1 optimistic compile text  
