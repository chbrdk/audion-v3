# Quality levers: agent UX testing closer to human EBM findings

**Date:** 2026-08-03  
**Context:** Live Bosch wave after CloudFront UA fix vs baseline `audion-2026-07-30-mcp`  
**Wave:** staging `wave-wave-bosch-staging-2026-08-03-msd6pgs9`

## Gap in one line

Agents now **reach the product** (good), but they are **too competent / too patient** — they under-report matrix confusion and over-report task success vs the human-oriented baseline narrative (H1/H2, Soft-Q ~2).

## Persona traits must drive behaviour (2026-08-03)

Yes: traits / interests / pain points / journey dimensions are the individuality of the persona and **must** change navigation, abandonment, and Soft-Q interpretation.

**Already wired (partial):**
- Study Start sends full `AgentPersonaContext` (`toAgentPersonaContext`) including traits, interests, goals, `dimensionOverrides` (`timePressure` → `time_pressure`, …).
- `audion-agent` `derive_policy()` → 6 dimensions + heuristics in the system prompt (`PERSONA_BEHAVIOR_POLICY`).
- High `time_pressure` already emits “prefer short paths / don’t explore side quests” style heuristics (prompt-level).

**Still soft (gap vs human impatience):**
- Policy is mostly **prompt advice**, not hard constraints.
- `max_steps` comes from the **run plan**, not from `time_pressure` / attentionSpan.
- No hard abandon after N unexplained grey options / confusion observations.
- `personaFitScore` does not yet gate Soft-Q or flag “optimistic bias vs trait profile”.

**Hardening direction:** map `time_pressure` / attentionSpan → step budget + confusion abandon threshold; surface active dimensions next to each run in the Wave UI.

## Quality levers (product / agent)

| Lever | Problem today | Turn toward |
|-------|---------------|-------------|
| **Abbruch-Persona** | Agent scrolls/searches 50 steps; humans quit | Persona knobs: low patience, abandon after N confusing states; explicit “would a real user stop?” check before `done` |
| **Confusion detectors** | Greyed options / matrix not named | Observation schema: `disabled_option_unexplained`, `filter_cause_unknown`, `selection_order_surprise` → feed Soft-Q Q2/Q3 |
| **Evidence gate** | `cancelled` + `validEvidence=true` | Reject cancelled / empty summary; require Think-Aloud with F-Fragen answers for validEvidence |
| **Friction calibration** | Friction 2–5 while baseline B was 9 | Recalibrate scorecard against labeled human clips; weight confusion observations higher than “goalReached” |
| **Segment contrast (H5)** | Purchase vs owner runs look similar | Different prompt stakes + success criteria; compare Soft-Q per segment in Evaluate |
| **Nav task fidelity (H3)** | Stops at Service link | Require URL/title proof of tool page; fail if only parent hub |
| **Soft-Q auto-draft** | Evaluate leaves Soft-Q empty | Assist draft from valid Think-Alouds + observations (already backlog in `knowledge/ux-studies.md`) |
| **Human anchor** | No calibration set | Keep 3–5 real clips as gold labels; agent wave must score within band or flag “optimistic bias” |
| **n / variance** | Single wave | 2–3 agent seeds (temperature/persona jitter); show spread not one mean |

## Visual / Wave UI levers

Hero today is rates (completion / evidence / infra). That reads as a **dashboard**, not a research readout. Prefer:

1. **One composition after Evaluate:** brand/study name + **one verdict line** (“Matrix unclear for owners; nav entry weak”) — not three equal Ledes competing with Soft-Q.
2. **Human vs Agent strip** (Compare built-in): side-by-side Soft-Q + H1–H5 for baseline wave vs this wave — one purpose section.
3. **Evidence wall:** per valid run — 1 quote (Think-Aloud), 1 screenshot, friction/fit as secondary — not editable finding textarea first.
4. **Confusion timeline:** steps where observations fired (grey option, wrong order) as a single vertical story; video scrub aligned.
5. **Infra vs UX split:** infra blockers in a quiet meta row; never mix into Soft-Q tones.
6. **Confidence chrome:** Soft-Q chips show `n=agent runs` + “not Testbirds” always (already partially in Soft-Q board copy — make it hero-adjacent).
7. **Running state:** StatusMeter is fine for ops; research mode should show live Think-Aloud subtitle, not fillPct bars as the main story.

## Suggested build order

0. **Persona Lab** (`pack-ebm-persona-lab-b` + `correlatePersonaLabRun`) — one B-run, self-score vs gold before full waves (`knowledge/persona-iteration-lab-2026-08-03.md`)
1. Evidence gate + cancel handling (trust)
2. Confusion observations → Soft-Q auto-draft
3. Visual: Compare-to-baseline + evidence wall
4. Patience / abandon persona policy (hard maxSteps from time_pressure)
5. Friction recalibration against gold clips

## Non-goals

- Replacing n=15 Testbirds statistically
- Optimizing for higher taskCompletion alone (that widens the human gap)
