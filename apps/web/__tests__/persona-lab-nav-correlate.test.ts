import { describe, expect, it } from 'vitest'
import {
  applyNavH3HypothesisFromRuns,
  correlatePersonaLabNavRun,
  navGoldSnapshot,
  navMissedToolSnapshot,
  toolTitleMatches,
  toolUrlMatches,
  waveRunToPersonaLabNavSnapshot,
  PERSONA_LAB_NAV_GOLD,
} from '../lib/persona-lab-nav-correlate'
import { createStudyFromScenarioPack, getScenarioPack } from '../lib/scenario-packs'
import { paths } from '../lib/paths'
import { resetUxStudyStore } from '../lib/fixtures/ux-study-store'
import type { UxWaveRunItem } from '@audion-v3/contracts'

describe('persona lab nav correlator (H3)', () => {
  it('registers nav pack with home urlKey, capped steps, and findability archetype', () => {
    const pack = getScenarioPack(paths.personaLabNavPackId)
    expect(pack).not.toBeNull()
    expect(pack!.archetype).toBe('findability')
    expect(pack!.successCriteria).toEqual({ kind: 'url_match', pattern: 'produktkombinationen' })
    expect(pack!.targetUrlKey).toBe('bosch.ebike.home')
    expect(pack!.runs[0]?.urlKey).toBe('bosch.ebike.home')
    expect(pack!.runs[0]?.maxSteps).toBe(PERSONA_LAB_NAV_GOLD.maxStepsCap)
  })

  it('matches tool URL/title helpers', () => {
    expect(toolUrlMatches(paths.boschEbikeProduktkombinationenUrl)).toBe(true)
    expect(toolUrlMatches(paths.boschEbikeHomeUrl)).toBe(false)
    expect(toolTitleMatches('Produktkombinationen | Bosch')).toBe(true)
    expect(toolTitleMatches('Home')).toBe(false)
  })

  it('correlates gold nav landing as closer', () => {
    const result = correlatePersonaLabNavRun(navGoldSnapshot())
    expect(result.closer).toBe(true)
    expect(result.checks.find((c) => c.id === 'url_matches_tool')?.pass).toBe(true)
  })

  it('correlates missed-tool snapshot as not closer', () => {
    const result = correlatePersonaLabNavRun(navMissedToolSnapshot())
    expect(result.closer).toBe(false)
    expect(result.checks.find((c) => c.id === 'url_matches_tool')?.pass).toBe(false)
  })

  it('maps wave run → nav snapshot', () => {
    const run: UxWaveRunItem = {
      id: 'run-nav-1',
      runKey: 'Nav-home-to-tool',
      leitfadenBlock: 'lab',
      personaId: paths.personaLabImpatientDbPersonaId,
      personaName: 'Alex',
      segment: 'owner_upgrade',
      url: paths.boschEbikeHomeUrl,
      task: 'nav',
      maxSteps: 12,
      jobId: 'j1',
      agentStatus: 'complete',
      agentSuccess: true,
      taskCompleted: true,
      validEvidence: true,
      validEvidenceCaveat: null,
      blockers: [],
      steps: 5,
      frictionScore: 6,
      personaFitScore: 3,
      goalReached: true,
      finding: 'Tool gefunden',
      categories: {},
      finalUrl: paths.boschEbikeProduktkombinationenUrl,
      finalTitle: 'Produktkombinationen',
      deeplinkCheat: false,
    }
    const snap = waveRunToPersonaLabNavSnapshot(run)
    expect(correlatePersonaLabNavRun(snap).closer).toBe(true)
  })

  it('applyNavH3HypothesisFromRuns refutes H3 when tool landed', () => {
    const run: UxWaveRunItem = {
      id: 'run-nav-1',
      runKey: 'Nav-home-to-tool',
      leitfadenBlock: 'lab',
      personaId: paths.personaLabImpatientDbPersonaId,
      personaName: 'Alex',
      segment: 'owner_upgrade',
      url: paths.boschEbikeHomeUrl,
      task: 'Starte auf der Startseite. Finde den Weg.',
      maxSteps: 12,
      jobId: 'j1',
      agentStatus: 'complete',
      agentSuccess: true,
      taskCompleted: true,
      validEvidence: true,
      validEvidenceCaveat: null,
      blockers: [],
      steps: 5,
      frictionScore: 6,
      personaFitScore: 3,
      goalReached: true,
      finding: 'Tool gefunden',
      categories: {},
      finalUrl: paths.boschEbikeProduktkombinationenUrl,
      deeplinkCheat: false,
    }
    const out = applyNavH3HypothesisFromRuns(
      [
        {
          id: 'H3',
          statement: 'Kein natürlicher Einstieg / Next Step',
          verdict: 'not_tested',
          confidence: 0,
          score: null,
          evidenceRunIds: [],
          rationale: '',
        },
      ],
      [run],
    )
    expect(out.navH3Pass).toBe(true)
    expect(out.hypotheses[0]?.verdict).toBe('refuted')
  })

  it('seeds study from nav pack', async () => {
    resetUxStudyStore()
    const created = await createStudyFromScenarioPack({
      packId: paths.personaLabNavPackId,
      waveKey: 'nav-unit',
    })
    expect(created!.wave.runs).toHaveLength(1)
    expect(created!.wave.runs[0]?.url).toBe(paths.boschEbikeHomeUrl)
  })
})
