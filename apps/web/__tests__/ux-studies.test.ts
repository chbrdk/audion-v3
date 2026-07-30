import { afterEach, describe, expect, it } from 'vitest'
import {
  buildWaveReportMarkdown,
  resetUxStudyStore,
  storeCompareUxWaves,
  storeCreateUxStudy,
  storeCreateUxWave,
  storeEvaluateUxWave,
  storePatchUxWave,
  storeStartUxWave,
  storeSyncUxWave,
  storeUxStudyDetail,
  storeUxStudyList,
  storeUxWaveDetail,
} from '../lib/fixtures/ux-study-store'
import { filterUxStudyList } from '../lib/ux-studies'
import { mapStudiesApiPath } from '../lib/ux-studies-proxy'
import { paths } from '../lib/paths'
import { TOOL_URL } from '../lib/fixtures/ux-studies'

afterEach(() => {
  resetUxStudyStore()
})

describe('ux study fixtures', () => {
  it('seeds EBM study with audion-2026-07-30-mcp wave', () => {
    const list = storeUxStudyList()
    expect(list.total).toBeGreaterThanOrEqual(1)
    const study = storeUxStudyDetail('study-ebm-produktkombinationen')
    expect(study?.name).toContain('Produktkombinationen')
    expect(study?.hypothesisTemplates).toHaveLength(5)
    const wave = storeUxWaveDetail(
      'study-ebm-produktkombinationen',
      'wave-audion-2026-07-30-mcp',
    )
    expect(wave?.waveKey).toBe('audion-2026-07-30-mcp')
    expect(wave?.evaluation?.hypotheses.find((h) => h.id === 'H2')?.verdict).toBe('supported')
    expect(wave?.runs.some((r) => r.validEvidence === true)).toBe(true)
    expect(wave?.reportMarkdown).toBeTruthy()
  })

  it('self-compare yields zero aggregate deltas', () => {
    const id = 'study-ebm-produktkombinationen'
    const wid = 'wave-audion-2026-07-30-mcp'
    const delta = storeCompareUxWaves(id, wid, wid)
    expect(delta).not.toBeNull()
    for (const row of Object.values(delta!.aggregateDelta)) {
      if (typeof row.baseline === 'number' && typeof row.current === 'number') {
        expect(row.delta).toBe(0)
      }
    }
  })

  it('evaluate recomputes aggregate from validEvidence', () => {
    const wave = storeEvaluateUxWave(
      'study-ebm-produktkombinationen',
      'wave-audion-2026-07-30-mcp',
    )
    expect(wave?.evaluation?.aggregate.runsValidEvidence).toBe(1)
    expect(wave?.evaluation?.aggregate.meanFrictionValidOnly).toBe(9)
  })

  it('creates studies and filters list', () => {
    storeCreateUxStudy({ name: 'Alpha Soft-Q Pilot', status: 'draft' })
    const list = filterUxStudyList(storeUxStudyList(), 'alpha')
    expect(list.items.some((i) => i.name.includes('Alpha'))).toBe(true)
  })

  it('creates wave with seed run', () => {
    const study = storeCreateUxStudy({ name: 'Wave Create Pilot', status: 'draft' })
    const wave = storeCreateUxWave(study.id, {
      waveKey: 'pilot-seed',
      runs: [
        {
          runKey: 'seed-owner',
          url: TOOL_URL,
          task: 'Explore',
          segment: 'owner_upgrade',
        },
      ],
    })
    expect(wave?.waveKey).toBe('pilot-seed')
    expect(wave?.runs).toHaveLength(1)
    expect(storeUxStudyDetail(study.id)?.waveCount).toBe(1)
  })

  it('start then sync advances runs to complete', () => {
    const studyId = 'study-ebm-produktkombinationen'
    const waveId = 'wave-phase2-plan-draft'
    const started = storeStartUxWave(studyId, waveId)
    expect(started?.status).toBe('running')
    expect(started?.runs.some((r) => r.agentStatus === 'running')).toBe(true)
    const synced = storeSyncUxWave(studyId, waveId)
    expect(synced?.status).toBe('complete')
    expect(synced?.runs.every((r) => r.agentStatus === 'complete')).toBe(true)
    expect(synced?.validEvidenceCount).toBeGreaterThan(0)
  })

  it('patches reportMarkdown and export includes body', () => {
    const studyId = 'study-ebm-produktkombinationen'
    const waveId = 'wave-audion-2026-07-30-mcp'
    const patched = storePatchUxWave(studyId, waveId, {
      waveKey: 'audion-2026-07-30-mcp',
      reportMarkdown: '<p>Phase-3 narrative body</p>',
    })
    expect(patched?.reportMarkdown).toContain('Phase-3 narrative body')
    expect(patched?.reportUpdatedAt).toBeTruthy()
    const md = buildWaveReportMarkdown(patched!, 'EBM')
    expect(md).toContain('Phase-3 narrative body')
    expect(md).toContain('## Aggregate')
  })

  it('patches Soft-Q value and confidence', () => {
    const studyId = 'study-ebm-produktkombinationen'
    const waveId = 'wave-audion-2026-07-30-mcp'
    const wave = storeUxWaveDetail(studyId, waveId)!
    const current = wave.evaluation!.softScores.Q1_nuetzlichkeit!
    const patched = storePatchUxWave(studyId, waveId, {
      waveKey: wave.waveKey,
      evaluation: {
        softScores: {
          ...wave.evaluation!.softScores,
          Q1_nuetzlichkeit: { ...current, value: 5, confidence: 0.8 },
        },
      },
    })
    const next = patched?.evaluation?.softScores.Q1_nuetzlichkeit
    expect(next?.value).toBe(5)
    expect(next?.confidence).toBe(0.8)
  })

  it('phase2 draft wave includes Nav and segment matrix runs', () => {
    const wave = storeUxWaveDetail(
      'study-ebm-produktkombinationen',
      'wave-phase2-plan-draft',
    )
    expect(wave?.runs.some((r) => r.runKey === 'Nav-home-to-tool')).toBe(true)
    expect(wave?.runs.some((r) => r.segment === 'purchase_intent' && r.runKey.includes('purchase'))).toBe(
      true,
    )
  })

  it('maps Next API paths to upstream ux-studies', () => {
    expect(mapStudiesApiPath('/api/studies')).toBe('/ux-studies')
    expect(mapStudiesApiPath('/api/studies/s1/waves/w1/evaluate')).toBe(
      '/ux-studies/s1/waves/w1/evaluate',
    )
    expect(mapStudiesApiPath('/api/studies/s1/waves/w1/start')).toBe(
      '/ux-studies/s1/waves/w1/start',
    )
    expect(mapStudiesApiPath('/api/studies/s1/waves/w1/sync')).toBe(
      '/ux-studies/s1/waves/w1/sync',
    )
  })

  it('registers study routes in paths', () => {
    expect(paths.routes.studies).toBe('/studies')
    expect(paths.routes.studyWaveDetail('s', 'w')).toBe('/studies/s/waves/w')
    expect(paths.routes.apiStudyWaveStart('s', 'w')).toBe('/api/studies/s/waves/w/start')
    expect(paths.routes.apiStudyWaveSync('s', 'w')).toBe('/api/studies/s/waves/w/sync')
    expect(paths.routes.chatWithPrompt('F2.1 hello')).toContain('/chat?prompt=')
    expect(
      paths.routes.chatWithContext({
        prompt: 'F2.1 hello',
        personaId: 'persona-x',
        studyId: 'study-y',
      }),
    ).toContain('personaId=persona-x')
    expect(paths.boschEbikeProduktkombinationenUrl).toContain('produktkombinationen')
  })
})
