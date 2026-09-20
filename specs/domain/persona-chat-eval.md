# Persona chat human-likeness eval

**Knowledge:** `knowledge/persona-chat-eval.md`  
**Code:** `apps/web/lib/chat/eval/` · `scripts/eval-persona-chat.mjs`

## Purpose

Enterprise regression gate for persona chat: replies must feel like **human participants**, in **DE and EN**, with a catalog that scales by adding cases—not by rewriting scorers.

## Scope

| In | Out |
|----|-----|
| Deterministic surface checks (length, residue, locale heuristic, GEO list size) | Full LLM-as-judge (optional later) |
| Bilingual baseline catalog (10 cases) | TG / project ask-all |
| Unit tests + live staging runner | Prod traffic sampling |

## Catalog contract

Each case:

```ts
{
  id: string
  locale: 'de' | 'en'
  mode: 'greeting' | 'opinion' | 'frustration' | 'geo' | 'product' | 'employer' | 'price' | 'compare' | 'followup'
  prompt: string
  expectations: {
    maxWords: number
    maxNumbered?: number
    forbid?: Array<'emoji' | 'interview' | 'category' | 'coach'>
    requireLocaleMatch?: boolean
  }
}
```

Baseline: **9 modes × 2 locales = 18 cases** in `catalog.json` (v1.1 corpus expansion). New markets/modes = append cases.

## Scoring

`scorePersonaChatCase(case, reply) → { passed, checks[] }`.  
All enabled checks must pass. Failures include `id` + evidence snippet for ops.

## Runtime

- **CI:** vitest on scorers + golden replies (no network).
- **Staging:** `AUDION_API_TOKEN=… node scripts/eval-persona-chat.mjs` → `.tmp/persona-chat-eval/latest.json`.

Default persona/project: env `EVAL_PERSONA_ID` / `EVAL_PROJECT_ID`, else first available from chat history / documented staging persona.

## Acceptance

1. Catalog exports ≥18 bilingual cases with unique ids (corpus modes included).
2. Scorers are locale-aware for interview/coach forbid lists; `maxNumbered` accepts `1.` and `1)`.
3. Unit tests cover pass and fail goldens per major check.
4. Live script documents env keys in `knowledge/paths.md` and writes JSON under `.tmp/`.
5. Adaptive chat few-shots are bilingual (`detectChatLocale`) so EN evals are not DE-biased.
6. Human spot-check notes live in `knowledge/persona-chat-spot-check-2026-09-20.md`.
