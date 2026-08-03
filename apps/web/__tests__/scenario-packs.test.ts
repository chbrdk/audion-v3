import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { demoPersonaDetail } from '../lib/fixtures/personas'
import { resetUxStudyStore, storeCompareUxWaves, storeEvaluateUxWave } from '../lib/fixtures/ux-study-store'
import {
  createStudyFromScenarioPack,
  getScenarioPack,
  listScenarioPacks,
  resolveScenarioPackUrl,
} from '../lib/scenario-packs'
import { paths } from '../lib/paths'
import { startUxWaveNativeOrFixture, syncUxWaveNativeOrFixture } from '../lib/ux-studies-native'
import * as agentClient from '../lib/ux-journey-agent-client'

afterEach(() => {
  resetUxStudyStore()
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

describe('scenario packs + EBM retest', () => {
  it('lists EBM pack and resolves URL keys via paths', () => {
    const packs = listScenarioPacks()
    expect(packs.some((p) => p.id === 'pack-ebm-produktkombinationen')).toBe(true)
    const pack = getScenarioPack('pack-ebm-produktkombinationen')
    expect(pack?.runs.length).toBeGreaterThanOrEqual(5)
    expect(pack?.runs.every((r) => r.maxSteps > 0)).toBe(true)
    expect(resolveScenarioPackUrl('bosch.ebike.produktkombinationen')).toBe(
      paths.boschEbikeProduktkombinationenUrl,
    )
    expect(resolveScenarioPackUrl('bosch.ebike.home')).toBe(paths.boschEbikeHomeUrl)
  })

  it('seeds Alex/Sam personas with full PersonaDetail fields for production build', () => {
    const alex = demoPersonaDetail('persona-alex-nachruester')
    const sam = demoPersonaDetail('persona-sam-kaufinteressent')
    expect(alex?.name).toContain('Nachrüster')
    expect(sam?.name).toContain('Kaufinteressent')
    for (const p of [alex, sam]) {
      expect(p).toMatchObject({
        visuals: null,
        profileDe: null,
        knowledgeEntries: [],
        documents: [],
      })
    }
  })

  it('creates study + draft wave from EBM pack', async () => {
    const result = await createStudyFromScenarioPack({
      packId: 'pack-ebm-produktkombinationen',
      waveKey: 'retest-smoke',
    })
    expect(result).not.toBeNull()
    expect(result!.study.targetUrlKey).toBe('bosch.ebike.produktkombinationen')
    expect(result!.wave.runs).toHaveLength(5)
    expect(result!.wave.runs.find((r) => r.runKey === 'B-aufgabe1-nachruesten')?.maxSteps).toBe(40)
    expect(result!.wave.runs.find((r) => r.runKey === 'C-aufgabe2-kombination')?.maxSteps).toBe(50)
    expect(result!.wave.evaluation?.waveId).toBe(result!.wave.id)
    expect(result!.wave.runs.every((r) => r.personaId?.startsWith('persona-'))).toBe(true)
  })

  it('fixture retest on EBM study: start → sync → evaluate → compare vs baseline', async () => {
    vi.stubEnv('NEXT_AI_RUNTIME', 'stub')
    const { createWaveFromScenarioPack } = await import('../lib/scenario-packs')
    const wave = await createWaveFromScenarioPack(
      'study-ebm-produktkombinationen',
      'pack-ebm-produktkombinationen',
      'retest-compare',
    )
    expect(wave).not.toBeNull()

    await startUxWaveNativeOrFixture('study-ebm-produktkombinationen', wave!.id)
    const synced = await syncUxWaveNativeOrFixture('study-ebm-produktkombinationen', wave!.id)
    expect(synced?.status).toBe('complete')
    const a = synced!.runs.find((r) => r.runKey === 'A-erstkontakt')
    expect(a?.validEvidence).toBe(false)
    expect(a?.blockers).toContain('cloudfront_403')
    expect(synced!.runs.find((r) => r.runKey === 'B-aufgabe1-nachruesten')?.validEvidence).toBe(
      true,
    )

    const evaluated = await storeEvaluateUxWave('study-ebm-produktkombinationen', wave!.id)
    expect(evaluated?.evaluation?.aggregate.runsValidEvidence).toBeGreaterThan(0)

    const delta = await storeCompareUxWaves(
      'study-ebm-produktkombinationen',
      wave!.id,
      'wave-audion-2026-07-30-mcp',
    )
    expect(delta).not.toBeNull()
    expect(delta!.baselineWaveId).toBe('wave-audion-2026-07-30-mcp')
    expect(delta!.currentWaveId).toBe(wave!.id)
  })

  it('passes run.maxSteps into agent start when configured', async () => {
    vi.stubEnv('UX_JOURNEY_AGENT_URL', 'http://ux-agent.test')
    const startSpy = vi.spyOn(agentClient, 'uxJourneyAgentStart').mockResolvedValue({
      jobId: 'job-maxsteps-1',
    })
    vi.spyOn(agentClient, 'isUxJourneyAgentConfigured').mockReturnValue(true)

    const created = await createStudyFromScenarioPack({
      packId: 'pack-ebm-produktkombinationen',
      waveKey: 'maxsteps-check',
    })
    expect(created).not.toBeNull()
    await startUxWaveNativeOrFixture(created!.study.id, created!.wave.id)

    const bCall = startSpy.mock.calls.find((c) =>
      String(c[0]?.task ?? '').includes('Performance Line'),
    )
    expect(bCall?.[0]?.maxSteps).toBe(40)
    const cCall = startSpy.mock.calls.find((c) => String(c[0]?.task ?? '').includes('Kiox 400C'))
    expect(cCall?.[0]?.maxSteps).toBe(50)
  })
})
