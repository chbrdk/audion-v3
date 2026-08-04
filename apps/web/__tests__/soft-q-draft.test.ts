import { describe, expect, it } from 'vitest'
import type { UxWaveRunItem } from '@audion-v3/contracts'
import {
  draftSoftScoresFromValidRuns,
  mergeSoftScoreDraft,
  softScoreLooksHandFilled,
} from '../lib/soft-q-draft'
import {
  evaluateUxWaveFromRuns,
  resetUxStudyStore,
  storeEvaluateUxWave,
  storeUxWaveDetail,
} from '../lib/fixtures/ux-study-store'

function validConfusionRun(overrides: Partial<UxWaveRunItem> = {}): UxWaveRunItem {
  return {
    id: 'run-lab-soft-q',
    runKey: 'B-aufgabe1-nachruesten',
    leitfadenBlock: 'lab',
    personaId: 'persona-alex-lab-impatient',
    personaName: 'Alex Lab',
    segment: 'owner_upgrade',
    url: 'https://example.test/tool',
    task: 'Nachrüsten',
    maxSteps: 10,
    jobId: 'job-soft-q',
    agentStatus: 'complete',
    agentSuccess: true,
    taskCompleted: true,
    validEvidence: true,
    validEvidenceCaveat: null,
    blockers: [],
    steps: 5,
    frictionScore: 8,
    personaFitScore: 7,
    goalReached: false,
    finding:
      'Die Matrix zeigt Optionen grau und ausgeblendet — Filterlogik unklar, ich breche ab.',
    categories: null,
    ...overrides,
  }
}

describe('soft-q-draft L6', () => {
  it('skips Soft-Q when no validEvidence runs', () => {
    const draft = draftSoftScoresFromValidRuns([
      validConfusionRun({ validEvidence: false, finding: '403 only' }),
    ])
    expect(draft.Q2_bedienbarkeit).toBeUndefined()
    expect(draft.basis).toMatch(/skipped/i)
  })

  it('drafts Q2/Q3 ≈ 2 when confusion cues appear in Think-Aloud', () => {
    const draft = draftSoftScoresFromValidRuns([validConfusionRun()])
    expect(draft.Q2_bedienbarkeit?.value).toBe(2)
    expect(draft.Q3_filterlogik?.value).toBe(2)
    expect(draft.Q6_nutzungswahrscheinlichkeit?.value).toBe(2)
    expect(draft.Q7_gesamteindruck?.value).toBe(4)
    expect(String(draft.Q2_bedienbarkeit?.rationale)).toMatch(/Auto-draft/i)
    expect(draft.basis).toMatch(/Think-Aloud draft/i)
  })

  it('drafts higher Q2 when optimistic valid run without confusion', () => {
    const draft = draftSoftScoresFromValidRuns([
      validConfusionRun({
        frictionScore: 2,
        goalReached: true,
        finding: 'Alles klar, mühelos gefunden, keine Reibung.',
      }),
    ])
    expect(draft.Q2_bedienbarkeit?.value).toBe(4)
    expect(draft.Q3_filterlogik?.value).toBe(4)
  })

  it('drafts Q4 when Nav run lands on tool', () => {
    const draft = draftSoftScoresFromValidRuns([
      validConfusionRun({
        runKey: 'Nav-home-to-tool',
        task: 'Starte auf der Startseite. Finde den Weg zum Produktkombinationen-Tool.',
        goalReached: true,
        finalUrl: 'https://www.bosch-ebike.com/de/service/produktkombinationen',
        frictionScore: 5,
        finding: 'Über Service zum Tool navigiert.',
      }),
    ])
    expect(draft.Q4_auffindbarkeit?.value).toBe(4)
  })

  it('drafts Q4=2 when Nav run misses tool', () => {
    const draft = draftSoftScoresFromValidRuns([
      validConfusionRun({
        runKey: 'Nav-home-to-tool',
        task: 'Starte auf der Startseite. Finde den Weg zum Tool.',
        goalReached: false,
        finalUrl: 'https://www.bosch-ebike.com/de/',
        finding: 'Auf der Startseite geblieben.',
      }),
    ])
    expect(draft.Q4_auffindbarkeit?.value).toBe(2)
  })

  it('emits core Soft-Q keys when pack shell is domainProfile core', () => {
    const shell = {
      basis: 'Pending',
      ease: { scale: '1-5', value: null, confidence: 0, rationale: '' },
      findability: { scale: '1-5', value: null, confidence: 0, rationale: '' },
      clarity: { scale: '1-5', value: null, confidence: 0, rationale: '' },
      usefulness: { scale: '1-5', value: null, confidence: 0, rationale: '' },
      likelihood: { scale: '1-5', value: null, confidence: 0, rationale: '' },
      overall: { scale: '1-6_schulnote', value: null, confidence: 0, rationale: '' },
    }
    const draft = draftSoftScoresFromValidRuns([validConfusionRun()], {
      existingSoftScores: shell,
      domainProfileId: 'core',
    })
    expect(draft.ease?.value).toBe(2)
    expect(draft.clarity?.value).toBe(2)
    expect(draft.Q2_bedienbarkeit).toBeUndefined()
    expect(draft.basis).toMatch(/core Soft-Q/i)
  })

  it('evaluateUxWaveFromRuns keeps core keys when existing shell is core', () => {
    const shell = {
      ease: { scale: '1-5', value: null, confidence: 0, rationale: '' },
      clarity: { scale: '1-5', value: null, confidence: 0, rationale: '' },
      usefulness: { scale: '1-5', value: null, confidence: 0, rationale: '' },
      findability: { scale: '1-5', value: null, confidence: 0, rationale: '' },
      likelihood: { scale: '1-5', value: null, confidence: 0, rationale: '' },
      overall: { scale: '1-6_schulnote', value: null, confidence: 0, rationale: '' },
    }
    const evaluation = evaluateUxWaveFromRuns(
      'study-x',
      'wave-x',
      [validConfusionRun()],
      null,
      { existingSoftScores: shell },
    )
    expect(evaluation.softScores.ease?.value).toBe(2)
    expect(evaluation.softScores.Q2_bedienbarkeit).toBeUndefined()
  })

  it('mergeSoftScoreDraft preserves hand-filled, refreshes auto-draft', () => {
    const draft = draftSoftScoresFromValidRuns([validConfusionRun()])
    const hand = {
      ...draft,
      Q2_bedienbarkeit: {
        scale: '1-5',
        value: 1,
        confidence: 0.9,
        rationale: 'Human edit: wirklich unbenutzbar.',
      },
    }
    const merged = mergeSoftScoreDraft(draft, hand)
    expect(merged.Q2_bedienbarkeit?.value).toBe(1)
    expect(merged.Q3_filterlogik?.value).toBe(2)

    expect(softScoreLooksHandFilled(hand.Q2_bedienbarkeit)).toBe(true)
    expect(softScoreLooksHandFilled(draft.Q2_bedienbarkeit)).toBe(false)

    const refreshed = mergeSoftScoreDraft(
      draftSoftScoresFromValidRuns([
        validConfusionRun({
          finding: 'Matrix grau und Filterlogik ohne Erklärung — Abbruch.',
          frictionScore: 9,
        }),
      ]),
      draft,
    )
    expect(refreshed.Q2_bedienbarkeit?.value).toBe(2)
    expect(String(refreshed.Q2_bedienbarkeit?.rationale)).toMatch(/Auto-draft/i)
  })

  it('evaluateUxWaveFromRuns embeds Soft-Q draft', () => {
    const evaluation = evaluateUxWaveFromRuns('study-x', 'wave-x', [validConfusionRun()], null)
    expect(evaluation.softScores.Q2_bedienbarkeit?.value).toBe(2)
    expect(evaluation.softScores.Q3_filterlogik?.value).toBe(2)
    expect(evaluation.notes.some((n) => /Soft-Q draft applied/i.test(n))).toBe(true)
  })

  it('mergeSoftScoreDraft fills null scenario-pack shell', () => {
    const draft = draftSoftScoresFromValidRuns([validConfusionRun()])
    const shell = {
      basis: 'Pending agent runs — Soft-Q filled after Evaluate on validEvidence.',
      Q1_nuetzlichkeit: { scale: '1-5', value: null, confidence: 0, rationale: '' },
      Q2_bedienbarkeit: { scale: '1-5', value: null, confidence: 0, rationale: '' },
      Q3_filterlogik: { scale: '1-5', value: null, confidence: 0, rationale: '' },
      Q6_nutzungswahrscheinlichkeit: { scale: '1-5', value: null, confidence: 0, rationale: '' },
      Q7_gesamteindruck: { scale: '1-6_schulnote', value: null, confidence: 0, rationale: '' },
    }
    const merged = mergeSoftScoreDraft(draft, shell)
    expect(merged.Q2_bedienbarkeit?.value).toBe(2)
    expect(merged.Q3_filterlogik?.value).toBe(2)
    expect(String(merged.basis)).toMatch(/Think-Aloud draft/i)
  })

  it('drafts Q2/Q3 ≈ 2 from perception stance/confusion markers in finding', () => {
    const draft = draftSoftScoresFromValidRuns([
      validConfusionRun({
        finding:
          'Wahrgenommen: Displays grau. stance:abandon confusion:disabled_option_unexplained — Abbruch.',
        frictionScore: 5,
      }),
    ])
    expect(draft.Q2_bedienbarkeit?.value).toBe(2)
    expect(draft.Q3_filterlogik?.value).toBe(2)
  })

  it('memory Evaluate preserves human Soft-Q on EBM fixture wave', async () => {
    resetUxStudyStore()
    const studyId = 'study-ebm-produktkombinationen'
    const waveId = 'wave-audion-2026-07-30-mcp'
    const before = await storeUxWaveDetail(studyId, waveId)
    expect(before?.evaluation?.softScores.Q2_bedienbarkeit?.value).toBe(2)
    const after = await storeEvaluateUxWave(studyId, waveId)
    expect(after?.evaluation?.softScores.Q2_bedienbarkeit?.value).toBe(2)
    expect(after?.evaluation?.softScores.Q2_bedienbarkeit?.rationale).toMatch(/Matrix/i)
    expect(String(after?.evaluation?.softScores.Q2_bedienbarkeit?.rationale)).not.toMatch(
      /^Auto-draft/i,
    )
  })
})
