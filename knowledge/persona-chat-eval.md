# Persona chat human-likeness eval (enterprise)

**Status:** Implemented 2026-09-20  
**Product:** AUDION v3 persona `/chat`  
**Code:** `apps/web/lib/chat/eval/` · live runner `scripts/eval-persona-chat.mjs`  
**Related:** `specs/domain/chat-workspace.md` · `knowledge/persona-chat-humanize-2026-09-20.md`

## Goal

Measure how close persona replies are to **human research participants** (not assistants), at a bar suitable for enterprise client work: bilingual (DE/EN), repeatable, extendable without rewriting the engine.

## Design principles

1. **Catalog is data** — append cases in `catalog.json` without changing scorers.
2. **Locale-first** — every case has `locale: de | en`; scorers and forbid-lists are locale-aware; runtime few-shots use `detectChatLocale`.
3. **Deterministic checks first** — word caps, forbidden assistant residue, question-count. Subjective “sounds human” stays a secondary human review lane.
4. **Two runners** — unit tests with golden replies (CI); live staging via Bearer (ops).
5. **No PII in repo** — live dumps go to `.tmp/persona-chat-eval/` (gitignored via `.tmp/`).

## Case shape

| Field | Role |
|-------|------|
| `id` | Stable slug (`de-greeting-01`) |
| `locale` | `de` \| `en` |
| `mode` | `greeting` \| `opinion` \| `frustration` \| `geo` \| `product` |
| `prompt` | User message |
| `expectations` | Caps + forbid tags + optional require tags |

## Baseline catalog (v1)

10 cases = 5 modes × 2 locales in `apps/web/lib/chat/eval/catalog.json`.

## Scorers (v1)

| Check | Pass when |
|-------|-----------|
| `maxWords` | word count ≤ expectation |
| `noEmoji` | no emoji codepoints |
| `noInterviewCloser` | no trailing “und bei dir?” / “how about you?” |
| `noCategoryLabels` | no U/BV/BR / Unbranded headers |
| `noCoachOffer` | no “wenn du willst…” / “if you want I can…” |
| `maxNumbered` | numbered list length ≤ cap (GEO) |
| `localeMatch` | reply language aligns with case locale (heuristic) |

Aggregate: `passed` iff all enabled checks pass. Report JSON for dashboards later.

## Enterprise quality bar (rubric)

Use for human spot-checks alongside automated scores:

| Dimension | Human-like | Fail |
|-----------|------------|------|
| Embodiment | First person, goals/pains show | Speaks as AI / coach |
| Brevity | Chat-length for mode | Essay / deck |
| Language | Matches user locale | Mixed boilerplate |
| Residue | No method labels / interview closer | GEO headers, emoji spam |
| Specificity | One lived detail | Generic brand praise |

Target for release gates: **≥90% automated pass** on baseline catalog against staging (`EVAL_PASS_RATE_GATE=0.9`); any fail is investigated before client demos.

## Run

```bash
# CI (deterministic)
cd apps/web && npm test -- persona-chat-eval

# Staging live
AUDION_API_TOKEN=audion_… node scripts/eval-persona-chat.mjs
```

## Paths

- Lib: `apps/web/lib/chat/eval/`
- Catalog SSOT: `apps/web/lib/chat/eval/catalog.json`
- Script: `scripts/eval-persona-chat.mjs`
- Out: `.tmp/persona-chat-eval/latest.json`
- Env: `AUDION_API_TOKEN` · `AUDION_V3_BASE_URL` · optional `EVAL_PERSONA_ID` / `EVAL_PROJECT_ID` / `EVAL_CASE_ID` / `EVAL_PASS_RATE_GATE`
