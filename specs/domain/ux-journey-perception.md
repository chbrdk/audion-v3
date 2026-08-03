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

1. Missing/invalid PERCEPTION → one retry nudge; then force `done` with caveat.  
2. `stance=abandon` → only `done` allowed.  
3. `stance=hesitate` → only `scroll` / `wait` / `extract` (no deep `click`/`input`/`navigate`).  
4. `stance=proceed` → normal actions; soft intent↔target overlap (P2).  
5. **Hard impatient upgrade (P4):** `time_pressure ≥ 0.75` + (`confusion` tag or clarity≤1) + grey/filter signal → force `stance=abandon` (even if model said proceed). Intent-align thrash upgrades to abandon instead of opaque `forcedDone`.  
6. Noticed enrich: cues already in think/why/intent may be promoted into `noticed[]` up to salience budget (no invented UI).  
7. L2 regex confusion-abandon remains safety net.

## Step payload

```ts
step.perception  // full validated object
step.thinkAloud  // legacy alias mapped from perception (seen←noticed digest, next←intent, …)
```

## Felt-state memory

Cross-step digest injected into the next user context:

`clarityTrend`, `lastValence`, `confusionCount`, `openQuestions[]`, `lastNoticedDigest`

## Soft-Q

Evaluate Soft-Q drafts also use perception `confusion` / low clarity / negative valence from validEvidence step blobs when present on the run finding or step trail.
