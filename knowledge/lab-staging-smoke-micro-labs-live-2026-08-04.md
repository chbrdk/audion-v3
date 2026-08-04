# Staging live smokes — Nav / Purchase / A+C / Sam Lab B

**Date:** 2026-08-04  
**Agent:** Luna · `UX_JOURNEY_TRY_BEFORE_ABANDON=3` · Soft-Q L6b on  
**Project:** `proj-bosch-ebike-msd3hwtv`  
**How-to:** `knowledge/persona-lab-micro-labs-2026-08-04.md`

## Summary

| Lab | Job(s) | Steps | Friction | Soft-Q Q2/Q3 | Verdict |
|-----|--------|-------|----------|--------------|---------|
| **Nav H3** | `9c368462…` → `2ad95280…` | 4 → 4 | 8 → 8 | 2/2 | **Still fail H3** — now clicks `Service & Beratung`, but still no verified tool URL |
| **Purchase** | `22e1278f…` → `4047747e…` | 2 → **8** | 7 → **8** | 2/2 | **Pass after minSteps gate** |
| **A Erstkontakt** | `1a875c23…` | 5 | 8 | 2/2 (wave) | **Pass** — try-then-quit → forced abandon |
| **C Kombination** | `c2bb058b…` → `c7fcf51f…` | 3 → 2 | 8 → invalid | 2/2 (wave) | **Fail rerun** — job errored / `validEvidence=false` |
| **Sam Lab B** | `25353178…` | **8** | 8 | 2/2 | **Pass** — contrast vs Alex explore-budget **5** |

First smoke set had `validEvidence=true`, no infra blockers. Rerun after fix commit `612db69` improved Purchase, partially improved Nav, and regressed C (`validEvidence=false`). Personas auto-resolved (Sam Lab B used one PATCH override on Lab B pack).

## Nav H3 (`pack-ebm-persona-lab-nav`)

- Study/wave: `study-persona-lab-nav-live-smoke-2026-08-04-mseboo33` / `wave-…mseboo3o`
- Start URL: `https://www.bosch-ebike.com/de/`
- First run (`9c368462…`): navigate → scroll → scroll → done; stayed on home
- Rerun (`2ad95280…`, after `612db69`): clicked **Service & Beratung** twice before done; no verified `produktkombinationen` URL
- Nav correlate still **closer=false** (`url_matches_tool` fail)
- Improvement: Lab-B matrix leak reduced — no fake `Performance Line` / `Display-Karten grau` on home; remaining wording is generic `Filter/Ursache prüfen`

**Status:** Gold scoping + Nav click bias landed, but H3 still needs stronger route-following after first Service click (likely submenu / next-step targeting rather than generic retry).

## Purchase (`pack-ebm-persona-lab-purchase`)

- Study/wave: `study-…msebs50j` / `wave-…msebs50p`
- Persona: `persona-sam-lab-geduldig-msdroy3t` (resolve, no PATCH)
- `impatientApplied=false`, `tryBeforeAbandon=6`, abandon **off**
- First run (`22e1278f…`): steps **2** despite `minSteps=6`
- Rerun (`4047747e…`, after `612db69`): steps **8**, friction **8**, patient hesitation visible through steps 3–8, ends with honest abandon

**Status:** **Fixed** by minSteps done gate.

## A+C (`pack-ebm-persona-lab-ac`)

- Study/wave: `study-…msebt3wz` / `wave-…msebt3x6`
- **A** Alex: 5 steps, explor 3/3, `forced=true` abandon — OK for Erstkontakt
- **C** first run (`c2bb058b…`): 3 steps, abandon off — short for full Kombination
- **C** rerun (`c7fcf51f…`): **error / invalidEvidence=false** after 2 steps; finding stuck at `Scrolled down 1080px`

**Status:** still open; rerun exposed a separate stability issue, not just early `done`.

## Sam Lab B contrast

- Study/wave: `study-…msebvfns` / `wave-…msebvfnz`
- PATCH Lab B run → Sam DB id (pack still seeds Alex fixture→Alex resolve)
- Steps **8**, tp **0.2**, friction **8**, correlate **closer 0.9**
- vs Alex explore-budget smoke (`ae533264…`): **5** steps → Sam > Alex ✓

## Soft-Q

L6b assist present (`LLM-assist:` rationales). Q2/Q3 stayed ~2 across waves. Q4 often null (nav/findability not auto-filled strongly).

## Fix rerun note

Fix commit: `612db69` — gold scoping off-tool, minSteps done gate, Nav click priority.  
Rerun studies: Nav `study-persona-lab-nav-rerun-2026-08-04-mseco1uu`, Purchase `study-persona-lab-purchase-rerun-2026-08-04-msecqpdp`, A+C `study-persona-lab-ac-rerun-2026-08-04-msecue1h`.
