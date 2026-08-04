# UX Study fields

| Field | Entity | Notes |
|-------|--------|-------|
| name | Study | Required |
| sourceGuide | Study | e.g. Testbirds guide title |
| targetUrlKey | Study | Central URL key (never raw URL in UI copy alone) |
| hypothesisTemplates | Study | H1–H5 statements |
| waveKey | Wave | Human/machine id e.g. `audion-2026-07-30-mcp` |
| status | Wave | draft \| running \| complete \| failed |
| reportMarkdown | Wave | Editable narrative report (TipTap); export source |
| reportUpdatedAt | Wave | ISO timestamp when report last saved |
| runKey | Run | A-erstkontakt, B-aufgabe1, … |
| segment | Run | owner_upgrade \| purchase_intent \| … |
| validEvidence | Run | Gate for aggregate + soft Q |
| frictionScore / personaFitScore | Run | From agent scorecard |
| finding | Run | Editable summary line |
| finalUrl / finalTitle | Run | From agent job; Nav H3 URL proof |
| deeplinkCheat | Run | Path-finding honesty (`navigate` to target) |
| softScores Q1–Q7 | Evaluation | Soft; PATCH value/confidence/rationale |
| verdict | Hypothesis | supported \| partially_supported \| inconclusive \| refuted \| not_tested |
| rationale | Hypothesis | Editable |

Nav pack Evaluate: Soft-Q **Q4** drafts from `goalReached`/`finalUrl`; H3 auto-verdict via `persona-lab-nav-correlate` (tool landing **refutes** „kein Einstieg“; miss **supports**).

## PATCH semantics (wave)

`PATCH /api/studies/{studyId}/waves/{waveId}` may include:

- `reportMarkdown` / `status`
- `evaluation` partial: `hypotheses[]`, `softScores`, `notes`
- `runs[]` partial by `id` / `runKey` (finding, scores) — fixture/API store merge
