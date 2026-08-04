# Staging live smokes — Nav / Purchase / A+C / Sam Lab B

**Date:** 2026-08-04  
**Agent:** Luna · `UX_JOURNEY_TRY_BEFORE_ABANDON=3` · Soft-Q L6b on  
**Project:** `proj-bosch-ebike-msd3hwtv`  
**How-to:** `knowledge/persona-lab-micro-labs-2026-08-04.md`

## Summary

| Lab | Job(s) | Steps | Friction | Soft-Q Q2/Q3 | Verdict |
|-----|--------|-------|----------|--------------|---------|
| **Nav H3** | `9c368462…` | 4 | 8 | 2/2 | **Fail H3** — stayed on home; no `produktkombinationen` URL |
| **Purchase** | `22e1278f…` | 2 | 7 | 2/2 | **Partial** — Sam policy OK; too short vs minSteps 6 |
| **A Erstkontakt** | `1a875c23…` | 5 | 8 | 2/2 (wave) | **Pass** — try-then-quit → forced abandon |
| **C Kombination** | `c2bb058b…` | 3 | 8 | 2/2 (wave) | **Partial** — short for Aufgabe 2 |
| **Sam Lab B** | `25353178…` | **8** | 8 | 2/2 | **Pass** — contrast vs Alex explore-budget **5** |

All runs: `validEvidence=true`, no infra blockers. Personas auto-resolved (Sam Lab B used one PATCH override on Lab B pack).

## Nav H3 (`pack-ebm-persona-lab-nav`)

- Study/wave: `study-persona-lab-nav-live-smoke-2026-08-04-mseboo33` / `wave-…mseboo3o`
- Start URL: `https://www.bosch-ebike.com/de/`
- Path: navigate → scroll → scroll → done (abandon)
- Saw “Service & Beratung”; never clicked into tool
- Nav correlate: **closer=false** (`url_matches_tool` fail); score 0.75
- Issue: Lab-B gold salience (`Display-Karten grau`, Performance Line) leaked into done-step `noticed` on **home** — matrix enrich/prompt not task-scoped

**Follow-up:** Scope P5 gold enrich + impatient matrix prompt to tool URL / Lab B runKey; Nav should prefer click Service → Produktkombinationen before abandon.

## Purchase (`pack-ebm-persona-lab-purchase`)

- Study/wave: `study-…msebs50j` / `wave-…msebs50p`
- Persona: `persona-sam-lab-geduldig-msdroy3t` (resolve, no PATCH)
- `impatientApplied=false`, `tryBeforeAbandon=6`, abandon **off**
- Steps **2** despite `minSteps=6` — early done undercuts patient explore intent

**Follow-up:** Enforce minSteps before accepting `done` for patient / purchase packs.

## A+C (`pack-ebm-persona-lab-ac`)

- Study/wave: `study-…msebt3wz` / `wave-…msebt3x6`
- **A** Alex: 5 steps, explor 3/3, `forced=true` abandon — OK for Erstkontakt
- **C** Sam: 3 steps, abandon off — short for full Kombination; Soft-Q still 2/2 from wave aggregate

## Sam Lab B contrast

- Study/wave: `study-…msebvfns` / `wave-…msebvfnz`
- PATCH Lab B run → Sam DB id (pack still seeds Alex fixture→Alex resolve)
- Steps **8**, tp **0.2**, friction **8**, correlate **closer 0.9**
- vs Alex explore-budget smoke (`ae533264…`): **5** steps → Sam > Alex ✓

## Soft-Q

L6b assist present (`LLM-assist:` rationales). Q2/Q3 stayed ~2 across waves. Q4 often null (nav/findability not auto-filled strongly).
