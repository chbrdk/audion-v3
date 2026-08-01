# UX Journey Think-Aloud Channels

**Status:** Accepted — 2026-08-01  
**Contracts:** `ChatUxJourneyThinkAloud` · `ChatUxJourneyFeel` · `ChatUxJourneyObservation` · `ChatUxJourneyStep`  
**Agent:** `services/ux-journey-agent/main.py` (`<<THINK_ALOUD>>` block)  
**Surface:** Chat step cards · inspect dock · convert evidence

## Product vs agent bookkeeping

Browser-use keeps fixed fields `thinking`, `evaluation_previous_goal`, `memory`, `next_goal` as **internal bookkeeping** (`reasoning` / `reasoningMeta` on the wire).

**Product source of truth** is `step.thinkAloud` — a structured object emitted inside `thinking` as:

```text
<<THINK_ALOUD>>{…json…}<</THINK_ALOUD>>
```

The agent strips the block (and `<<OBSERVATIONS>>`) from voice-over text. Cleaned `thinking` remains TTS / video VO (1–3 sentences, first person).

## Channels

| Field | DE UI | Meaning |
|-------|--------|---------|
| `seen` | Gesehenes | What is perceived on screen right now |
| `think` | Denken | Interpretation / hypothesis (VO core) |
| `priorKnow` | Schon gewusst | Persona prior knowledge driving the decision |
| `learned` | Neu gelernt | Delta learned this step / visit |
| `next` | Nächster Schritt | Persona intent (no bot selector / index) |
| `why` | Warum | Justification (need, doubt, goal) |
| `feel` | Gefühl | `{ label: string, valence: -2 \| -1 \| 0 \| 1 \| 2 }` |

UI order on step cards: Gesehenes → Denken → Schon gewusst → Neu gelernt → Nächster Schritt → Warum → Gefühl.  
Compact preview: Denken open (+ feel pill); other channels closed until expand.  
`result` stays action outcome — separate from think-aloud.

## Observations (research flags)

Optional, max 2 per step, inside `thinking` as `<<OBSERVATIONS>>[…]<</OBSERVATIONS>>`.

| Field | Notes |
|-------|--------|
| `category` | `layout` \| `visual` \| `typography` \| `copy` \| `affordance` \| `navigation` \| `info_density` \| `trust` \| `performance` \| `persona_fit` |
| `polarity` | −2…2 |
| `severity` | `low` \| `medium` \| `high` |
| `note` | short research note |
| `fix` | optional remediation hint |

Surfaced as chips on **expanded** step cards. Feed scorecard aggregation.

## Scorecard (journey-level)

On run complete, `result.scorecard` is persisted on `ChatConversationInspect` / `ChatToolCompleteEvent`.

Chat inspect dock (v1, compact — not full magazine spider):

- `frictionScore` (0–10)
- `personaFitScore` (0–10)
- top strength / weakness labels when present

## Fallback (legacy runs without `<<THINK_ALOUD>>`)

| Channel | Source |
|---------|--------|
| `think` | `reasoning` |
| `learned` | `reasoningMeta.memory` |
| `next` | `reasoningMeta.next_goal` |
| `seen`, `priorKnow`, `why` | `null` |
| `feel` | optional map from first observation polarity |

## Out of scope

- Forking browser-use `AgentOutput` schema
- Journey phase `expected_emotion` contract (remains convert path)
