# Behavioral Controller (cross-surface fidelity)

**Status:** Accepted — 2026-10-07 (Phase 1: compile + contracts; surface wiring incremental)  
**Knowledge:** `knowledge/human-behavior-fidelity-options-2026-10.md` · `knowledge/behavioral-controller.md`  
**Contracts:** `@audion-v3/contracts` — `BehavioralPolicy`, `BehavioralSessionState`, `TargetGroupBehavioralPriors`  
**Compile:** `apps/web/lib/behavior/compile-behavioral-policy.ts`  
**Inputs:** `specs/domain/persona-fields.md` · `specs/domain/target-group-fields.md`  
**Consumers:** UX Journey (`ux-journey-perception.md`) · Persona chat (`chat-workspace.md`) · Tavus/Bey (`tavus-video-chat.md`, `bey-video-chat.md`)

## Purpose

One **deterministic, versioned behavioral policy** compiled from persona magazine fields and optional target-group priors. Three surfaces **render** the same policy; they do not invent separate trait interpretations.

Enterprise bar:

1. **Explainable** — every knob cites source layers (override / scalar / trait / TG / default).
2. **Deterministic** — same inputs → same policy (`schemaVersion` + `traitLexiconVersion`).
3. **Bounded** — LLM may narrate inside the envelope; runtime **enforces** timing, try budgets, verbosity, abandon, repair.
4. **Session-dynamic** — affect/frustration/fatigue evolve; static traits alone are not enough.
5. **Multi-tenant safe** — policy is Collection-scoped via persona/TG; no cross-tenant bleed; audit via `policyId` + `compiledAt` on runs.
6. **Human-gold ready** — knobs map 1:1 to scoreboard dimensions for correlation.

### Explainable UI (chat)

Operators need **why this reply** without opening Studies. Persona chat stamps a `ChatReplyRationale` on each assistant message (and on stream `done`):

- Built from the **same** policy + session that shaped the envelope (not post-hoc LLM narration).
- Compact collapsible above the answer; collapsed by default; hidden in guest embed.
- Shows voice lane, stance, frustration/fatigue, top cited drivers, optional stress-hit phrases.
- Does **not** invent causes the compiler did not cite.

`lib/behavior/reply-rationale.ts` · UI `components/chat-reply-rationale.tsx` · `specs/domain/chat-workspace.md` § Reply rationale.

## Non-goals (Phase 1)

- Training a custom foundation model.
- Using GUI-agent SOTA (SeeClick / UI-TARS) as the persona brain.
- Replacing magazine editing UX — controller **reads** magazine; it does not invent a second trait editor.

## Architecture

```text
PersonaDetail (+ optional TargetGroupBehavioralPriors)
        │
        ▼
 compileBehavioralPolicy()     ← pure, unit-tested
        │
        ▼
 BehavioralPolicy (immutable for the run start)
        │
        ├──► Browse adapter  → agent PersonaContext + runtime gates
        ├──► Chat adapter    → system envelope + completion knobs + post-filters
        └──► Video adapter   → PAL/system prompt + turn/prosody hints
        │
        ▼
 BehavioralSessionState (mutable per turn/step)
        │
        ▼
 Telemetry / Soft-Q / human-gold correlators
```

### Separation of concerns

| Layer | Owns | Must not |
|-------|------|----------|
| **Magazine** | Identity, traits, goals, pains, style, journey overrides | Surface-specific hacks |
| **Compiler** | 0..1 knobs, budgets, voice envelope, citations | Call LLMs or browsers |
| **Adapters** | Map policy → journey / chat / video APIs | Re-derive traits differently |
| **Runtime FSM** | Enforce stance, dwell, try-then-quit, turn caps | Invent perception from free text when gates fail |
| **LLM** | Natural language inside envelope | Override hard budgets |

## Compile precedence (highest wins)

For each numeric knob `k ∈ [0,1]`:

1. **Explicit override** — `persona.journeyBehavior.dimensionOverrides` (mapped keys) or future `persona.behavioralOverrides`.
2. **Direct scalar** — e.g. `techLiteracy`, `confidence`, `communicationStyle.skepticismLevel`.
3. **Trait lexicon** — `traits` keys matched by versioned regex patterns (`traitLexiconVersion`).
4. **Target-group priors** — blend: `knob = (1−w)·persona + w·tg` with `w = priors.blendWeight` (default **0.25** when TG present and persona layer was default-only; **0** when persona had override/scalar/trait hit).
5. **Surface-neutral default** (documented per knob, usually 0.45–0.55).

String/list fields (dos/donts/stressTriggers/goals): **merge + dedupe**, persona first, TG segment cues append (capped).

`attentionSpan` (free text) → parse heuristic into `attentionCapacity` (0..1); if unparseable, leave default and cite `default`.

## Canonical knobs (`BehavioralDimensions`)

All floats clamped 0..1 unless noted.

### Tempo & cognition

| Knob | Primary sources | Effect (all surfaces) |
|------|-----------------|------------------------|
| `timePressure` | override, traits (impatient/busy…), TG | Shorter dwell, lower try budget, shorter chat turns, faster video pacing |
| `exploration` | override, traits (curious…) | More scroll/category try; chat tangents allowed once; less tunnel vision |
| `detailOrientation` | override, traits (detail/analy…) | Higher salience budget / noticed cap; longer caveats in chat; fewer vague video answers |
| `attentionCapacity` | `attentionSpan`, traits, TG | Caps parallel goals in working memory; chat topic stickiness |
| `workingMemorySlots` | derived int 2..5 from attention + detail | Hard cap on episodic “things I already tried” |

### Epistemic & skill

| Knob | Primary sources | Effect |
|------|-----------------|--------|
| `riskAversion` | override, traits | Prefer safe paths; hesitate on irreversible CTAs; cautious video consent |
| `trustSkepticism` | override, style.skepticism, traits | Challenge claims; proof-seeking in chat; less accept-all in browse |
| `confidence` | scalar, traits | Stance bias proceed vs hesitate; chat assertiveness |
| `techLiteracy` | scalar, traits, role/bio heuristic | Jargon OK vs plain language; nav strategy (search vs browse) |
| `accessibilityNeed` | override, traits | Prefer clear labels; avoid tiny targets; slower video diction hint |

### Affect

| Knob | Primary sources | Effect |
|------|-----------------|--------|
| `affectVolatility` | traits (neuro/anx/stress…) | How fast `frustrationLoad` rises on stressTriggers |
| `stressSensitivity` | stressTriggers[], frustrations[], volatility | Thresholds for abandon / sharp tone |
| `emotionalBaseline` | string label | Default `feel.label` / chat valence / video mood seed |

### Communication (chat + video; browse think-aloud)

| Knob | Primary sources | Effect |
|------|-----------------|--------|
| `verbosity` | inverse timePressure + detail | Max tokens / sentence count |
| `warmth` | traits (agree/empath/extra…) | Softeners vs blunt |
| `formality` | role/bio + style | Register |
| `hedgeRate` | risk + low confidence + volatility | “vielleicht”, “ich glaub” |
| `repairWillingness` | exploration + low risk + warmth | Ask clarifying Q; admit miss |
| `interruptibility` | timePressure + volatility | Video: allow barge-in / short turns |

## Qualitative envelope (compiled lists)

| Field | Source | Cap |
|-------|--------|-----|
| `goalsActive` | goals[] by priority | 5 |
| `avoidances` | frustrations + donts | 8 |
| `stressTriggers` | stressTriggers + frustration labels | 8 |
| `motivations` | motivations (+ goal/value derive) | 8 |
| `dos` / `donts` / `heuristics` | journeyBehavior + derive | 8 each |
| `vocabulary` / `sentenceStructure` | communicationStyle | vocab 12 |
| `priorKnowledge` | knowledgeEntries truncated | 4 × 400 chars |

## Session state (`BehavioralSessionState`)

Mutable per browse step / chat turn / video turn. Initialized from policy.

| Field | Type | Dynamics |
|-------|------|----------|
| `frustrationLoad` | 0..1 | += f(stress hit, failed click, confusion) × stressSensitivity; −= small on success |
| `clarity` | 0..3 | Journey perception; chat may mirror as self-rated understanding |
| `fatigue` | 0..1 | += per step/turn × timePressure |
| `tryBudgetRemaining` | int | From policy `tryBeforeAbandon`; −= on exploratory acts |
| `lookBeforeActSatisfied` | bool | Per URL (browse) |
| `episodic` | `{ kind, key, at }[]` | Cap = `workingMemorySlots`; drop oldest |
| `stance` | proceed \| hesitate \| abandon | Enforced by FSM |
| `surface` | browse \| chat \| video | |
| `turnIndex` | int | |

Hard rules (enterprise, fail-closed):

1. `stance=abandon` only if `tryBudgetRemaining ≤ 0` **or** explicit honest-stop protocol — except safety/consent rejects.
2. `stance=hesitate` forbids deep browse actions (align `ux-journey-perception.md`).
3. Chat: if `verbosity` low, post-filter / maxTokens must cut lists and essays.
4. Video: same turn-length and repair policy as chat; Face/replica never overrides content policy.
5. Never synthesize perception/noticed from free thought when structured block missing (existing P4.1).

## Surface adapters

### Browse (`BehavioralBrowseAdapter`)

Maps to existing agent fields + runtime:

| Policy | Runtime |
|--------|---------|
| timePressure ≥ 0.75 | `UX_JOURNEY_IMPATIENT_MAX_STEPS`, short dwell |
| timePressure ≤ 0.35 | longer dwell, higher try budget |
| exploration / detail | noticed cap, browse-min-scrolls, try-before-abandon deltas |
| techLiteracy | search-vs-category bias (high → earlier site-search unlock OK; low → category-first longer) |
| trustSkepticism | require extra confirm on checkout-like CTAs (future gate) |
| stressTriggers + frustrationLoad | gateSignals.frustrationHigh |
| dos/donts/heuristics | agent PersonaContext |
| dimensionOverrides snake_case | existing `dimensionOverridesForAgent` |

**Must remain compatible** with `toAgentPersonaContext` — adapter may wrap it, not fork trait math.

### Chat (`BehavioralChatAdapter`)

| Policy | Runtime |
|--------|---------|
| verbosity / timePressure | `max_tokens`, post-filter length |
| warmth / formality / hedgeRate | adaptive prompt blocks (replace ad-hoc-only hints) |
| trustSkepticism / style | existing skepticism rules |
| repairWillingness | allow “kurz nachfragen” once per topic |
| fatigue / frustrationLoad | sharpen tone; shorter; optional abandon-topic |
| goals / avoidances | priority content without assistant mode |
| vocabulary / sentenceStructure | How you talk (unchanged SSOT) |

### Video / Facetime (`BehavioralVideoAdapter`)

| Policy | Runtime |
|--------|---------|
| Same voice envelope as chat | PAL `system_prompt` sections (capped) |
| interruptibility / timePressure | turn-taking / idle hints in conversational context |
| emotionalBaseline + frustrationLoad | mood line in PAL (no trait dump) |
| formality / warmth | speak-as rules |
| **Not sent** | visuals, tiles, raw traits map dump (keep Tavus cap) — send **compiled prose**, not magazine JSON |

Bey provider uses the same adapter contract (`video-call-providers.md`).

## Target group priors

TG today is thin (`name`, `segment`, `description`, linked personas). Enterprise extension:

```ts
TargetGroupBehavioralPriors {
  blendWeight?: number // 0..1, default 0.25
  dimensions?: Partial<BehavioralDimensions> // optional explicit
  segmentCues?: string[] // keywords from segment/description for lexicon
  sharedStressTriggers?: string[]
  sharedAvoidances?: string[]
}
```

Compile modes:

1. **Explicit priors** on TG (Phase 1.1 storage — optional JSON on TG detail).
2. **Derived priors** — mean of linked personas’ compiled dimensions (batch job / on-demand); used when explicit absent.
3. **Segment lexicon** — regex on `segment`+`description` only as weak prior (cite `tg_segment`).

Personas remain SSOT for identity; TG is **bias**, not replacement — except when running **segment chat** without a single persona (then TG-derived policy + anonymized voice).

## Versioning & audit

| Field | Purpose |
|-------|---------|
| `schemaVersion` | `2026-10-behavioral-v1` |
| `traitLexiconVersion` | `2026-10-lexicon-v1` |
| `policyId` | hash(personaId, tgId?, schema, lexicon, knob blob) |
| `compiledAt` | ISO |
| `citations` | per-knob `{ source, ref? }` |

Persist `policyId` + `schemaVersion` on UX journey jobs, chat threads, and video sessions for replay and enterprise audit.

## Telemetry (minimum)

Emit on each run/thread:

- policy knobs (0..1 snapshot)
- session end: frustrationLoad, tryBudget used, stance histogram / turn length p50/p90
- surface id

Correlate against human gold (`ux-lab-archetypes.md` scoreboard in knowledge doc).

## Phased delivery

| Phase | Ship |
|-------|------|
| **1** | Spec + contracts + `compileBehavioralPolicy` + unit tests + knowledge — **done** |
| **2** | Chat adapter: envelope + dynamic length rules + `resolvePersonaChatMaxTokens` in native stream — **done** (`lib/behavior/chat-adapter.ts`) |
| **4** | Video adapter: PAL spoken rules + session context hint (Tavus/Bey via `buildTavusPalSystemPrompt`) — **done** (`lib/behavior/video-adapter.ts`) |
| **3** | Chat session FSM: per-conversation frustration/fatigue ticks + live envelope + token shrink — **done** |
| **3b** | Persist session in messages jsonb + persona affect mirror + video seed — **done** |
| **1b** | Browse adapter → agent PersonaContext dims/budgets — **done** (`lib/behavior/browse-adapter.ts` · `resolveAgentPersonaContext`) |
| **5** | TG `behavioralPriors` column + derive-from-linked + compile blend — **done** |
| **4+** | Video conversational context from mirrored chat affect — **done** (`lib/behavior/video-session.ts`) |
| **6** | Human-gold scoreboard keyed by `policyId` — **done** (`behavioral-gold-scoreboard.md` · `/studies/behavioral`) |
| **7** | Chat reply-rationale strip (Why this reply) — **done** (`reply-rationale.ts` · `chat-reply-rationale.tsx`) |

## Acceptance (Phase 1)

1. Spec + knowledge + contracts + inventory green.
2. Compile is pure: impatient trait set → high `timePressure`, low `verbosity`; patient/detail → opposite.
3. Explicit `dimensionOverrides.timePressure` beats trait derivation.
4. TG blend only applies when persona knob source is `default` (or weight rules above).
5. Tests cover citations and clamp.

## Acceptance (Phase 2 + 4 — chat/video)

1. Adaptive chat prompt includes `## Behavioral envelope` compiled from the same policy as video.
2. Native chat `max_completion_tokens` follows persona policy budgets (env ceiling still wins).
3. Full magazine → Tavus/Bey PAL includes `Spoken behavior (compiled):` and trait-driven pace/repair/warmth.
4. Minimal PAL sources without `id`/traits still build (backward compatible).
5. Adapter unit tests + adaptive/tavus prompt tests green.

## Acceptance (Phase 3 — chat session FSM)

1. Same `conversationId` accumulates frustration when user text hits stressTriggers/avoidances.
2. System prompt gains `## Live session state` with stance (proceed/hesitate/abandon-curt).
3. Token cap shrinks under frustration/fatigue; short greetings soft-recover.
4. Unit tests cover stress estimate, tick, envelope, token shrink.

## Acceptance (Phase 3b + 1b + 5 — depth)

1. `behavioralSession` round-trips in chat messages jsonb (DB + memory).
2. Persona affect mirror seeds video conversational context after stressed chat.
3. `resolveAgentPersonaContext` ships policy dims + tryBeforeAbandon budget note.
4. TG `behavioralPriors` PATCH persists; compile blends when persona knob is soft.
5. `compilePolicyForPersona` attaches `targetGroupId` for linked personas.
6. Depth tests in `__tests__/behavioral-depth-phase3b5.test.ts` green.

## Related

- Perception enforcement: `specs/domain/ux-journey-perception.md`
- Chat humanize: `knowledge/persona-chat-humanize-2026-09-20.md`
- Journey dims derive (legacy helper, superseded as *source* but kept for magazine “Derive” button): `apps/web/lib/persona-agent-derive.ts` — compiler may call `traitSignal` patterns aligned with lexicon v1.
