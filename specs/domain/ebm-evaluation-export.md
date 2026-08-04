# EBM Evaluation Export (Testbirds-parallel)

**Status:** Accepted — 2026-08-04  
**Knowledge:** `knowledge/paths.md` (EBM Auswertung) · hand-authored mirror `knowledge/ebm-auswertung-ux-test-ai-2026-08-04.md`  
**Code:** `apps/web/lib/ux-auswertung-report.ts` · CLI `scripts/export-ebm-auswertung.mjs`  
**Input:** evaluation JSON (`schemaVersion` 1.0.0) e.g. `knowledge/ebm-produktkombinationen-evaluation-audion-*.json`

## Product rule

Export an **Auswertung** markdown that parallels the Testbirds / Human-PDF structure (methodik, hypotheses ampel, Soft-Q, run IDs, recommendations stub) from a machine-readable EBM evaluation JSON. This is **not** the generic in-app wave report (`buildWaveReportMarkdown`).

## Schema (export JSON)

Superset of `UxWaveEvaluation` plus flattened run slices:

| Field | Notes |
|-------|--------|
| `schemaVersion` | `"1.0.0"` |
| `studyId` / `waveId` / `evaluatedAt` / `method` | Wave identity |
| `sourceGuide` / `targetUrlKey` | Leitfaden + URL key |
| `agentCommit` / `agentBaseline` / staging URLs | Optional ops metadata |
| `notes[]` | Caveats (Soft-Q basis, path-finding honesty, …) |
| `runs[]` | Flat export runs: `runId`, persona, segment, jobId, steps, friction, finding, `finalUrl?`, `deeplinkCheat?`, `actions?`, `taskOutcome?` |
| `aggregate` | Wave aggregate + optional `deeplinkCheatRate`, `navH3Pass`, … |
| `hypotheses[]` | H1–H5 verdicts |
| `softScores` | Q1–Q7 (+ `basis`) |
| `leitfadenQuestionCoverage?` | F2.x / Qx coverage map |
| `comparisonKeys?` | Dot-paths for wave-to-wave diff |

## MD sections (Auswertung)

1. Header metadata table  
2. Methodik (3 Schritte — template)  
3. Selbsteinschätzung / persona proxy from `runs`  
4. Hypothesen table (ampel from `verdict` + `confidence`)  
5. Soft-Q table from `softScores`  
6. Job-IDs / runs table  
7. Aggregate + notes  
8. Handlungsempfehlungen stub (optional narrative sidecar later)

## Outputs

| Format | Generator | Audience |
|--------|-----------|----------|
| Auswertung MD | `buildEbmAuswertungMarkdown` | Stakeholder / Testbirds parallel |
| Testing report | hand / separate ops MD | Wave KPI diff |
| Wave generic | `buildWaveReportMarkdown` | In-app export |

## CLI

```bash
node scripts/export-ebm-auswertung.mjs \
  --input knowledge/ebm-produktkombinationen-evaluation-audion-2026-08-04-pathfind.json \
  --out /tmp/ebm-auswertung.md
```

Optional `--pdf` when `pandoc` is available (not required for MD ship).

## Soft-Q note

When Wave Evaluate Soft-Q was empty, export may still render Soft-Q from offline/evidence-derived scores in the JSON. Prefer re-Evaluate on web ≥ L6 before treating Soft-Q as live.
