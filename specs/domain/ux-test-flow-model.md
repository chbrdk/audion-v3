# UX Test Flow Model

**Status:** Accepted (V1 + Canvas + Live-Gates + Phase 3 + **Phase 4**: multi-gate sequential replan, agent-native branch planner, hybrid moderated+agent)  
**Contracts:** `@audion-v3/contracts` — `UxTestFlow`, `UxFlowNode`, `UxFlowEdge`, `UxSavedFlow*`, `UxFlowGateSignalBundle`, `UxFlowCursor`, `UxFlowReplanEvent`  
**Scenarios catalog:** `specs/domain/ux-test-flow-scenarios.md`  
**UI:** `/studies/flows` (template gallery + block list + React Flow canvas + moderated / hybrid protocol)

## Purpose

Product-facing **test flow** layer: few node kinds compose the ten canonical scenarios. End users pick a template and create a Study/Wave without editing code packs.

Scenario packs remain the execution seed shape. Flows **compile** into pack-like runs for Study create (V1 shape kept). **Phase 4** shifts live execution to an **agent-native branch planner**: compile no longer embeds full when-branch trees into the initial task; the agent receives `flow_graph`, evaluates Live-Gates, and injects **next segments** via `add_new_task`. Multi-gate sequential replan walks the **active path** (prior when/otherwise choices). Hybrid sessions interleave human protocol steps with live agent segments on the same `UxTestFlow` graph.

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

| Id | Meaning | V1 / Study compile | Live-Gate | Mid-run replan (Phase 4) |
|----|---------|-------------------|-----------|--------------------------|
| `frustration_high` | Self-report / perception frustration | Soft gate note only (no when-tree embed) | `gateSignals.frustrationHigh` | Sequential: next when-segment via `add_new_task` |
| `url_match` | `finalUrl` matches `pattern` | `successCriteria.url_match` | `gateSignals.finalUrl` + pattern | Same |
| `title_match` | `finalTitle` matches `pattern` | `successCriteria.title_match` | `gateSignals.finalTitle` + pattern | Same |
| `consent_accepted` | User confirmed external/privacy | Soft gate note | `gateSignals.consentAccepted` | Same |
| `consent_rejected` | User declined | Soft gate note | `gateSignals.consentRejected` | Same |
| `goal_reached` | Task goal met | Soft successCriteria / task wording | `gateSignals.goalReached` | Same |
| `confusion_named` | Confusion explicitly named | Soft gate note | `gateSignals.confusionNamed` | Same |
| `time_elapsed` | Observe window done | Prompt timing in task | `elapsedSeconds` vs `observeSeconds` | Same |

## Graph rules

1. Exactly one `start` node.
2. Every non-terminal node has ≥1 outgoing edge (`then` or gate pair).
3. `gate` must have one `when` and one `otherwise` edge.
4. Terminals: `success` | `abandon` (optional trailing `measure`).
5. No cycles in V1 templates.

## Compile (V1 Study create) + branch planner (Phase 4)

`compileUxTestFlowToPackShape(flow)` → `UxScenarioPack`-compatible object (Study/Wave create unchanged):

1. Walk **default / otherwise path**: `start` → follow `then`; at `gate` follow `otherwise` (optimistic continue).
2. Concatenate `prompt` / `observe` / `action` / `message` texts into `task`.
3. At each `gate`, append a **short Live-Gate note** (`GATE (cond): runtime evaluates; matched → replan segment`). **Do not** embed the full `when`-branch tree into the initial task (Phase 4 planner shift).
4. First `url_match` / `title_match` on the graph → pack/run `successCriteria`.
5. `start.urlKey` → `targetUrlKey` and run `urlKey`.
6. Soft-Q keys: core profile (`ease`…`overall`) unless flow sets `domainProfileId`.
7. `parallel` edges from start → **additional runs** (same task; persona/segment from the parallel target node).
8. Each wave run carries `flowGraph` (nodes+edges snapshot) so the agent walks the graph live.

### Agent-native branch planner

When `POST /run` includes `flow_graph`:

1. Initial task = lean compile text (default path + soft gate notes).
2. After each partial-steps publish, agent evaluates gates on the **active path** (see multi-gate replan).
3. On match: build **next segment only** — nodes after the gate along `when` until the **next gate** (exclusive) or terminal — and `add_new_task(segment)`.
4. Nested gates on that branch fire later as their own segments (no one-shot full-tree inject).
5. Same product model — not a second project / flow type.

Study create still uses compile for pack shape + URL/persona; live branching is agent-owned.

## Canvas (session edit + persist)

- Detail page: toggle **Liste | Canvas | Protokoll** (default Canvas when a full graph exists).
- Canvas uses `@xyflow/react`; node/edge payload is the same `UxTestFlow` JSON.
- Layout positions are UI-only (not persisted on `UxFlowNode`).
- **Save** persists the session snapshot via `ux-flow-store` → Postgres `ux_saved_flows` when `DATABASE_URL` is set; otherwise in-memory. Keyed by template `flowId` (or saved id). **Reset to template** restores the catalog fixture. Reload prefers saved variant when present.
- Create Study may POST an inline `flow` snapshot; server validates then compiles (V1 pack + lean task).
- All 10 catalog templates ship with full graphs (`compileReady`).
- **Undo** keeps a short in-session history stack (last N graph snapshots).
- Theming: node/viewport/run-strip chrome uses CSS variables (`--flow-*` + Audion tokens) so **light and dark** themes both look intentional.

## In-flow live run (progress overlay)

- Canvas **Testen** creates a Study+Wave from the current snapshot, starts the wave (agent), and polls `GET /api/ux-journey-agent/run/{jobId}`.
- Node states overlay: `idle | active | done | skipped | error`.
- **Inline node output:** active/done/error nodes render the latest mapped agent step (action/target headline, result/think-aloud text, screenshot via BFF proxy).
- Progress mapper (`ux-flow-run-progress.ts`) preference order:
  1. Optional poll `flowCursor` / `gateEvaluations` / `replan` + `replanHistory` when present.
  2. Else evaluate flow gates against agent `gateSignals` on the **active path**.
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
    },
    "replanHistory": [
      { "gateNodeId": "n-feel-gate", "edgeKind": "when", "condition": "frustration_high", "remainingTask": "…", "at": "…" }
    ]
  }
}
```

`flowCursor` is optional; when omitted, the web mapper derives gate outcomes from `gateSignals` + the flow graph. `replan` is the latest event; `replanHistory` lists successive multi-gate replans (canvas aligns via history).

### Mid-run agent replan — multi-gate sequential (Phase 4)

When `POST /run` includes optional `flow_graph` (`{ id, nodes, edges }`):

1. Agent stores the graph on the job and evaluates it after each partial-steps publish.
2. **Active path:** start → `then`; at each gate, follow prior branch choice (`when` if that gate already replanned, else `otherwise`).
3. On the first **unfired** matching gate on the active path, build the **next when-segment** (nodes after the gate until the next gate exclusive, or terminal) and call `agent.add_new_task(segment)`.
4. Record gate id in `replanned_gate_ids` / branch choices; append to `replanHistory`; mirror latest on `flowCursor.replan`.
5. Later gates further down the active path (including nested gates on a prior `when` branch) may fire the same way — one shot per gate id (no loops).
6. Poll payload keeps canvas aligned via `replan` + `replanHistory` + `activeEdgeKind: "when"`.

Wave Start passes `flowGraph` from each `UxWaveRunItem` when present (set at Study-from-Flow create).

## Moderated protocol + hybrid session (Phase 4)

### Moderated-only (Phase 3)

- View **Protokoll** on `/studies/flows/[flowId]` (and via `?view=protocol`).
- Human moderator walks the same graph **without** calling the journey agent:
  - Default/`otherwise` path as checklist steps.
  - At gates: moderator chooses **wenn** / **sonst** (branches remaining path).
  - Per step: notes + optional measure score; Done / Skip / Back.
  - Session stays in-browser (exportable summary text); no agent job.

### Hybrid (Phase 4)

Same `UxTestFlow` graph; mode = moderated checklist **plus** optional live agent handoff for agent-runnable steps (`action` / `observe` / `prompt` with actionable text):

1. Moderator walks protocol; gates stay human (**wenn** / **sonst**).
2. On an agent-runnable step: **Agent ausführen** → BFF starts a short journey-agent job for that **segment** (start URL from flow `start`, task = node/segment text, small `maxSteps`).
3. Protocol shows job status (poll); moderator may wait for complete, then Done / Skip / continue.
4. Agent does **not** own gate choices in hybrid — human remains the branch authority for the session.
5. Optional: after agent segment completes, notes auto-fill with a one-line job summary.

Minimal slice: one segment job at a time; no multi-user collab; same Study/Wave model not required (direct agent start via BFF).

## Surfaces / API

| Surface | Role |
|---------|------|
| `GET /studies/flows` | Template gallery |
| `GET /studies/flows/[flowId]` | Block list + canvas + protocol/hybrid + create CTA + in-flow Testen |
| `GET /api/studies/from-flow` | List catalog summaries |
| `POST /api/studies/from-flow` | `{ flowId?, flow?, name?, projectId?, waveKey? }` → Study+Wave (+ `flowGraph` on runs) |
| `GET /api/studies/flows/saved` | List saved user flow snapshots (ACL-filtered when owner known) |
| `GET /api/studies/flows/saved/[id]` | Get one saved snapshot (owner check when set) |
| `POST /api/studies/flows/saved` | Upsert saved snapshot (`templateFlowId` + `flow` + optional owner/org) |
| `DELETE /api/studies/flows/saved/[id]` | Delete saved snapshot (owner check when set) |
| `POST /api/studies/flows/hybrid-segment` | `{ flow, nodeId, maxSteps? }` → `{ jobId, url, task }` for protocol handoff |
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
| `owner_id` | text nullable | Session user id when known (Phase 4 ACL foundation) |
| `org_id` | text nullable | Optional org / team scope (Phase 4 ACL foundation) |
| `created_at` / `updated_at` | timestamptz | |

**ACL policy (foundation):** rows with `owner_id` null remain legacy-shared; when the request has a session user, list/get/update/delete prefer that owner's rows (+ legacy null). Org-scoped sharing UI is follow-up — schema + API stamp/filter only in this slice.

Facade: `apps/web/lib/fixtures/ux-flow-store.ts` — Postgres when `DATABASE_URL` set, else in-memory (tests/local). API surface unchanged except ACL filters + hybrid-segment route.

## Phase plan

| Phase | Shipped | Deferred |
|-------|---------|----------|
| V1 | Templates, compile, canvas edit, Study create | — |
| Phase 2 | Live-Gate signals (url/title/frustration/consent/goal/time), canvas branch, fixture saved flows | — |
| Phase 3 | Mid-run replan on gate fire, `ux_saved_flows` Postgres, moderated protocol view | — |
| **Phase 4 (this slice)** | Multi-gate sequential replan on active path + `replanHistory`; agent-native branch planner (lean compile + next-segment inject); hybrid protocol agent handoff; saved-flow `owner_id`/`org_id` ACL foundation | Org-scoped sharing UI / invite ACLs; multi-agent parallel mid-run orchestration; collaborative multi-user live protocol |
| **Phase 5 — Interactive board** | Single **Board** mode (design + live test + notes + segment); per-node `note` persisted on Save; path edge highlight; manual gate → `POST …/gate-branch` triggers real `add_new_task` replan | Step scrubber; sticky free notes; org sharing UI |
| **Phase 6a — Node inspector** | Side **Inspector** on node select / note focus: full agent steps per node (action, target, result, reasoning, think-aloud, perception, screenshots); step timing (Δ + elapsed); job-level metrics; gate evaluation + replan history | Step scrubber; Study ↔ Board evaluate loop |
| **Phase 6c — Inspector UX** | n8n-style inspector: collapsible sections, execution timeline, color-coded field tones (action/target/result/reasoning/perception), action badges, gate/replan cards | Step scrubber |
| **Phase 7 — Completion & evidence** | `deriveFlowVerdict()`; Board **Verdict** card after Testen; Wave Sync merges flow terminal + gates into `taskCompleted` when `flowGraph` present | Persist `lastRunVerdict` on saved flow; Evaluate shortcut from Board |
| **Phase 8 — Workspace magazine** | Board chrome → magazine tokens; consume `@msqdx/ui` `FloatingPanel` **+ flow board chrome** (`FlowBoardStage`, `FlowNodeCard`, … — `msqdx-ui/specs/domain/flow-board-chrome.md`); rounded float shells (12px) + pill Bausteine FAB; DS Input/Button | Essay hero on board; RF replacement |

## Completion & evidence contract (Phase 7)

After **Testen**, the Board must answer in one place:

| Verdict | Meaning |
|---------|---------|
| **Flow completed** | Active execution path reached a terminal node (`success` or honest `abandon`) when the job finished |
| **Task completed** | `success` terminal **or** `gateSignals.goalReached` **or** scorecard `coverage.goalReached` |
| **Valid evidence** | Same rules as Study/Wave (`inferValidEvidence` in `ux-wave-scorecard.ts`) — UX substance, no junk/crash |
| **Gates on path** | Each gate on the active path with `matched` + branch taken (`when` / `otherwise`) |

### Derivation

`deriveFlowVerdict(flow, job)` in `apps/web/lib/ux-flow-run-progress.ts`:

1. Build active path via `buildExecPath` (same as node states / inspector).
2. Collect gate evaluations on that path (`evaluateFlowGatesOnPath`).
3. Terminal = last node on path when `status === 'complete'`; kind `success` | `abandon` | other.
4. `taskCompleted` = terminal is `success` **or** goal signals (agent bundle + scorecard).
5. `validEvidence` = `inferValidEvidence` from steps/summary/blockers (Study parity).
6. While `running`: partial verdict — gate list + goalReached if already true; completion flags stay open.

### Board UI

Live Run panel shows **Verdict** below the status strip when a job is active or complete:

- Flow completed ✓/✗ · Task completed ✓/✗ · Valid evidence ✓/✗ (+ caveat)
- Gate chips (condition + matched)
- Link **Open wave** → Study Sync / Evaluate (existing)

### Study / Wave sync bridge

When `UxWaveRunItem.flowGraph` is set, `mapAgentResultToWaveRun` calls `deriveFlowVerdict` and **OR**s flow `taskCompleted` into the run field (scorecard path unchanged). `validEvidence` still uses `inferValidEvidence`; flow success terminal can lift `taskCompleted` only.

Deferred: persist `lastRunVerdict` on `ux_saved_flows.flow` metadata; Board → Evaluate one-click.

## Upstream — Collection Test Flow (Plexon)

Cross-product programs that mix this journey graph with CHECKION page scans / score gates are orchestrated in **Plexon** on the Collection — not as a second Audion project. Spec: `plexon-v3/specs/domain/collection-test-flow.md`. Audion remains owner of journey execution + Phase 7 evidence fields; Plexon merges Collection verdict.

## Immersive flow board (Phase 6b)

Board mode uses a fixed full-viewport React Flow stage. Chrome (Testen/Save, Bausteine, Live Run, Inspector) floats in draggable panels via `@msqdx/ui` **`FloatingPanel`** (SnapDock) — same interaction model as the primary NavRail. Dock positions persist in `localStorage` (`paths.flowBoard*DockKey`).

## Workspace magazine (Phase 8)

The Board is a **functional workspace**, denser than persona/essay magazine, but it must speak the **same design language** — not glass SaaS chrome.

| Principle | Board implication |
|-----------|-------------------|
| Square / hairline | Floats, nodes, strips: `border-radius: 0`; hairline `--line` |
| Fill-free / solid | No frosted blur default; solid `--paper`/`--surface` |
| Underline / DS fields | Prefer `@msqdx/ui` `Input`/`Textarea`/`Field` or underline-fit; drop boxed 4px hand-rolled inputs where density allows |
| DS atoms | Toolbar/palette/verdict actions via `Button` (square/sm), `Chip`, `Text` |
| Shared chrome | `FloatingPanel` + flow board organisms from `@msqdx/ui` (`flow-board-chrome.md`) — not app-local SnapDock glass wrappers or parallel `.audion-flow-*` SoT |

### Keep / reshape / drop

| | |
|--|--|
| **Keep** | Immersive stage; SnapDock dock model; React Flow graph; run-state feedback; inspector + verdict data; compact toolbar affordances |
| **Reshape** | Floats → solid with 12px radius; toolbar → rounded strip; RF nodes → kind top-rule cue; inspector → hairline disclosure; verdict/run → hairline band; stage → fixed full viewport |
| **Drop** | Frosted glass floats; pill toolbar/FAB; soft 6–12px card radii; run glow pulse as default; parallel hand-rolled button/input systems |

Domain RF node composition and verdict mapping stay in Audion. Shared overlay shell lives in `msqdx-ui` (`specs/domain/floating-panel.md`).

## Node inspector (Phase 6a)

Selecting a node on the Board opens a right-hand **Inspector** panel (desktop). Clicking into **Note** also selects the node.

| Section | Content |
|---------|---------|
| **Header** | Node kind, run state, label, id |
| **Design** | `text`, `note` (read-only mirror of board fields) |
| **Job** | Status, total steps, elapsed seconds, job id, final URL, error |
| **Agent steps** | All steps mapped to this node — not truncated like inline node output |
| **Gate** | `gateEvaluation` + `replanHistory` entries for gate nodes |

Mapper: `mapJobToFlowNodeInspector()` in `apps/web/lib/ux-flow-run-progress.ts`. Job summary: `buildJobRunSummary()`.

**Phase 6c presentation:** Inspector uses n8n-like collapsible sections, left-accent field tones, execution timeline with action badges, and differentiated gate/replan cards — see `ux-flow-node-inspector.tsx` + `globals.css` `.audion-flow-inspector-*`.

## Interactive flowboard (Phase 5)

One surface `/studies/flows/[flowId]` — **Board** (default). Liste remains for catalog-only flows.

| Capability | Behavior |
|------------|----------|
| **Notes** | `UxFlowNode.note` — editable on every node; persisted in saved flow `flow` jsonb via Save |
| **Live test** | **Testen** — same Study/Wave loop; active path edges highlighted; gate evidence on node |
| **Manual gate** | During run: Gate node **Wenn/Sonst → Agent** → `POST /run/{jobId}/gate-branch` → `add_new_task` segment |
| **Segment** | **Agent-Segment** on runnable nodes when no full test running |
| **Output → Note** | Append agent output text into node `note` |
| **Legacy views** | `?view=protocol` / `?view=canvas` redirect to Board |

Agent route: `POST /run/{jobId}/gate-branch` body `{ gateNodeId, edgeKind: "when"|"otherwise" }`.

## Out of scope (still later)

- Org/team sharing UI and invite ACLs on saved flows (schema foundation shipped)  
- Multi-user collaborative live protocol editing  
- Parallel mid-run orchestration of multiple agent jobs inside one hybrid session  
- Replacing Study/Wave create with a non-pack execution path (compile pack shape remains)  
