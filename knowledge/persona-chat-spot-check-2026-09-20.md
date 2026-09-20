# Persona chat human spot-check (2026-09-20)

**Source:** Staging live eval after `07efc44` · Lisa Hartmann (`persona-vg-lisa-neubau`) · `.tmp/persona-chat-eval/latest.json`  
**Rubric:** `knowledge/persona-chat-eval.md` (Embodiment / Brevity / Language / Residue / Specificity)  
**Automated:** 10/10 pass · Gate ≥90%

## Verdict

Surface humanization works (no residue, locale OK, chat-length). **Human-likeness is still one-note:** almost every non-greeting answer orbits the same thesis — marketing vs datasheets/SCOP. On-brand for Lisa Neubau, but not yet “enterprise simulation of a person” across turns.

## Scores (manual)

| Case | Embod. | Brevity | Lang | Residue | Spec. | Note |
|------|:------:|:------:|:----:|:-------:|:-----:|------|
| de-greeting-01 | ✓ | ✓ | ✓ | ✓ | ✓ | Lived “Effizienzhaus/Heizung” without dump |
| en-greeting-01 | ✓ | ✓ | ✓ | ✓ | ✓ | Neubau on mind — natural |
| de-opinion-01 | ✓ | ✓ | ✓ | ✓ | ~ | Gut feel + SCOP; strong but stock |
| en-opinion-01 | ✓ | ✓ | ✓ | ✓ | ~ | Same spine as DE |
| de-frustration-01 | ✓ | ✓ | ✓ | ✓ | ✓ | Best emotional specificity |
| en-frustration-01 | ✓ | ✓ | ✓ | ✓ | ✓ | Marketing–datasheet gap lands |
| de-product-01 | ✓ | ✓ | ✓ | ✓ | ~ | Restates opinion/frustration |
| en-product-01 | ✓ | ✓ | ✓ | ✓ | ~ | Same |
| de-geo-01 | ✓ | ✓ | ✓ | ✓ | ✓ | Spoken lead-in + 6 questions |
| en-geo-01 | ✓ | ✓ | ✓ | ✓ | ✓ | Good Qs; used `1)` not `1.` (scorer gap) |

**Manual pass:** 10/10 surface · **Human depth:** ~7/10 (specificity monotony).

## Findings → actions

1. **SCOP/datasheet monotony** — add chat-rule: vary lived detail across turns; don’t repeat the same rant. Catalog: price / employer / compare modes force other facets.
2. **Numbered list forms** — count `1.` and `1)` in `maxNumbered` (EN GEO used parens).
3. **Corpus coverage** — Vaillant GEO follow-ups (“fragen die *du* stellen würdest”), Employer, Price, Competitor compare were missing from v1 catalog → v1.1 cases.

## Follow-up (v1.1 · `0a78e32`)

Live catalog **18/18** pass after employer/price/compare/followup + monotony rule. Employer/price answers show clearer facet variety (Kununu/Systemkosten) vs product/opinion still SCOP-heavy — expected for Lisa Neubau; sample Employer persona next for client demos.
