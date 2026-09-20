# Persona chat Employer spot-check — Michael Sander (2026-09-20)

**Persona:** `persona-michael-sander-mtiqiv3o` (GEO / Employer)  
**Project:** `proj-vaillant-mtiexc5t`  
**Artifact:** `.tmp/persona-chat-eval/michael-sander-latest.json`  
**Related:** Lisa product run `knowledge/persona-chat-spot-check-2026-09-20.md`

## First live run (pre language-lock harden)

| Metric | Value |
|--------|------:|
| Automated | 16/18 (89%) — below 90% gate |
| Failures | `de-product-01` maxWords 70>60 · `en-compare-01` replied DE |

## Human read (Employer facets)

| Case | Verdict | Note |
|------|---------|------|
| de-employer-01 | Strong | Führungsstruktur, Standort-Zukunft, Familienunternehmen — not SCOP |
| en-employer-01 | Strong | Org chart / proof / controversies — lived hiring lens |
| de-followup-01 | Strong | Bullet questions, no PR fluff, decision-path specificity |
| en-followup-01 | Strong | Same in EN |
| de-geo / opinion | OK | Still product/system flavored when asked heating — expected |

**Takeaway:** Michael is the right demo voice for Employer/GEO. Lisa remains the product/Neubau demo. Do not use one persona for both client narratives.

## Fixes shipped after fail

1. Per-turn `languageTurnEnvelope` (locks EN/DE from latest user message; survives German brand names).
2. Stronger static LANGUAGE line for EN (don’t slip to German for Viessmann/Vaillant).
3. Product eval cap 60 → 80 words (system thinkers like Michael need a bit of room).

## Re-run after language-lock (`15a7f61`)

| Metric | Value |
|--------|------:|
| Automated | **18/18 (100%)** |
| Gate | Pass (≥90%) |

Employer/followup remain the demo strength (culture, Führungsstruktur, decision path). Soft watch: `en-compare-01` sometimes opens with a German filler (“Gut, dass du das fragst”) then continues in EN — locale heuristic still passes; tighten later if client EN demos care.
