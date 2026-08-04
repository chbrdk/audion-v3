# Staging — Soft-Q core + Nav Findability 3× Repeat

**Date:** 2026-08-04  
**Web:** `28a743e` · deploy `lu4kdica3kj88xu5rjuepp0v`

## Klartext

1. **Bewertungsfragen (Soft-Q):** Generische Packs bekommen jetzt generische Noten (`ease`, `findability`, …). Bosch-Packs behalten die bekannten Fragen Q1–Q7.
2. **Dreimal dasselbe Lab:** „Auffindbarkeit Home → Produktkombinationen“ — dreimal hintereinander, damit das Ergebnis nicht von einem Glückstreffer abhängt.

## Soft-Q core verify (non-Bosch template)

| | |
|--|--|
| Study | `study-soft-q-core-verify-msezotnf` |
| After Evaluate | Keys = `ease`, `findability`, `clarity`, `usefulness`, `likelihood`, `overall` (keine Q1–Q7) |
| Scores | ease **2**, findability **2** (Ziel nicht erreichbar — erwartet) |

**Verdict:** Pass.

## Nav Findability repeats (n=3)

| # | Steps | Ziel erreicht | Cheat | Q4 | H3 |
|---|-------|---------------|-------|----|----|
| 1 | 8 | ja | nein | 4 | widerlegt („kein Einstieg“ stimmt nicht) |
| 2 | 6 | ja | nein | 4 | widerlegt |
| 3 | 5 | ja | nein | 4 | widerlegt |

Alle drei: `validEvidence=true`, gelandet auf Produktkombinationen, ohne Deeplink-Cheat.

Studies:
- `study-nav-findability-repeat-1-3-2026-08-04-msezqrdm`
- `study-nav-findability-repeat-2-3-2026-08-04-msezvfcx`
- `study-nav-findability-repeat-3-3-2026-08-04-msf00426`

**Verdict:** Pass — Auffindbarkeit in diesem Setup **3/3** reproduzierbar; Soft-Q Auffindbarkeit (Q4) konsistent **4**.
