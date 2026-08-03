# UX Journey Perception-in-the-Loop

**Status:** Accepted — 2026-08-03  
**Knowledge:** `knowledge/ux-journey-perception-in-loop.md`  
**Agent:** `services/ux-journey-agent/perception.py` + `main.py`  
**Legacy:** `specs/domain/ux-journey-think-aloud.md` (`<<THINK_ALOUD>>` still parsed → mapped)

## Product rule

Perception happens **before** action in the same step. Persona filters what is noticed. Non-perception (blind spots) must influence the decision in-loop — not a post-hoc judge.

## Wire format

Emitted inside `thinking`:

```text
<<PERCEPTION>>{…json…}<</PERCEPTION>>
```

### Required / validated fields

| Field | Type | Notes |
|-------|------|--------|
| `taskReminder` | string | What I am trying to do now |
| `noticed` | `{what, where?, relevance}[]` | Cap = salience budget |
| `ignoredGuess` | string \| null | What I skip / do not check |
| `think` | string | Interpretation, first person |
| `clarity` | 0–3 | 0 = lost, 3 = clear enough to act |
| `feel` | `{label, valence:-2..2}` | Affect |
| `confusion` | tag \| null | See tags below |
| `stance` | `proceed` \| `hesitate` \| `abandon` | Decision |
| `intent` | string | What I will do next (first person) |
| `why` | string | Justification |

### Confusion tags

`disabled_option_unexplained` | `filter_cause_unknown` | `selection_order_surprise`

### Relevance

`high` | `med` | `low`

## Salience budget (persona)

| `time_pressure` | Budget (max `noticed`) |
|-----------------|------------------------|
| ≥ 0.75 | 3 |
| ≤ 0.35 | 6 |
| else | 4 |

Extra −1 when `detail_orientation` < 0.35 (min 2). Extra +1 when ≥ 0.75 (max 7).

## Gate (runtime)

1. **P4.1 — no synthesize:** Missing/invalid `<<PERCEPTION>>` → nudge + clear `done`/`click`/… (soft wait/scroll only). Retries via `UX_JOURNEY_PERCEPTION_MISSING_RETRIES` (default 3). **Never** invent a perception from free-form thinking. **Never** force `DoneAgentOutput` solely because the block is missing.  
2. `stance=abandon` → only `done` allowed (still requires a valid PERCEPTION on that turn).  
3. `stance=hesitate` → only `scroll` / `wait` / `extract` (no deep `click`/`input`/`navigate`).  
4. `stance=proceed` → normal actions; soft intent↔target overlap (P2).  
5. **Impatient upgrade with try-then-quit:** `time_pressure ≥ 0.75` + (`confusion` tag or clarity≤1) + grey/filter signal → prefer abandon, but first require `UX_JOURNEY_TRY_BEFORE_ABANDON` (default 1) exploratory hesitate/scroll/click (`stanceSoftened`). After budget + persistent low clarity → force `stance=abandon`. Intent-align thrash upgrades to abandon only after try budget.  
6. Noticed enrich: cues already in perception think/why/intent may be promoted into `noticed[]` up to salience budget (no invented UI, no free-thinking invent).  
7. L2 regex confusion-abandon remains safety net — also gated on try-then-quit exploratory budget.  
8. Felt-state continuity: `clarityTrend` / `exploratoryAttempts` injected next step; prefer abandon when clarity stays low across steps after try budget.

## Step payload

```ts
step.perception  // full validated object
step.thinkAloud  // legacy alias mapped from perception (seen←noticed digest, next←intent, …)
```

## Felt-state memory

Cross-step digest injected into the next user context:

`clarityTrend`, `lastValence`, `confusionCount`, `openQuestions[]`, `lastNoticedDigest`, `exploratoryAttempts`, `lowClarityStreak`

## Soft-Q

Evaluate Soft-Q drafts also use perception `confusion` / low clarity / negative valence from validEvidence step blobs when present on the run finding or step trail.
