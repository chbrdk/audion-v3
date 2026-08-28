import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { execSync } from 'child_process'
import { mkdirSync, writeFileSync, readFileSync, rmSync } from 'fs'
import { join } from 'path'

const ROOT = join(__dirname, '..', '..', '..')
const TMP = join(ROOT, 'knowledge', 'ebm-runs', '__test-tmp__')

function makeRunJson(overrides: Record<string, unknown> = {}) {
  return {
    status: 'complete',
    result: {
      success: false,
      summary: 'Display-Karten grau/disabled; Filter-Ursache unklar; Abbruch.',
      steps: [
        { step: 1, action: 'navigate' },
        { step: 2, action: 'scroll' },
        { step: 3, action: 'done' },
      ],
      scorecard: {
        frictionScore: 8,
        personaFitScore: null,
        coverage: { goalReached: false },
      },
      ...overrides,
    },
  }
}

function makeNavRunJson(goalReached: boolean) {
  return makeRunJson({
    success: goalReached,
    summary: goalReached
      ? 'Tool gefunden über Service-Menü'
      : 'Home → Service-Cue wahrgenommen; kein Tool-URL; Abbruch.',
    scorecard: {
      frictionScore: goalReached ? 3 : 8,
      personaFitScore: null,
      coverage: { goalReached },
    },
  })
}

describe('aggregate-ebm-evaluation.mjs', () => {
  const waveDir = join(TMP, '2099-01-01', 'wave-1')

  beforeAll(() => {
    mkdirSync(waveDir, { recursive: true })
    writeFileSync(join(waveDir, 'run-A-erstkontakt.json'), JSON.stringify(makeRunJson()))
    writeFileSync(join(waveDir, 'run-B-aufgabe1-nachruesten.json'), JSON.stringify(makeRunJson()))
    writeFileSync(
      join(waveDir, 'run-C-aufgabe2-kombination.json'),
      JSON.stringify(makeRunJson({ success: true, scorecard: { frictionScore: 4, personaFitScore: null, coverage: { goalReached: true } } })),
    )
    writeFileSync(join(waveDir, 'run-Nav-home-to-tool.json'), JSON.stringify(makeNavRunJson(false)))
    writeFileSync(join(waveDir, 'run-B-aufgabe1-purchase-intent.json'), JSON.stringify(makeRunJson()))
  })

  afterAll(() => {
    rmSync(TMP, { recursive: true, force: true })
  })

  it('produces valid schema v1.0.0 evaluation JSON', () => {
    const outPath = join(TMP, 'eval-wave-1.json')
    execSync(`node scripts/aggregate-ebm-evaluation.mjs --dir "${waveDir}" --out "${outPath}"`, { cwd: ROOT })
    const result = JSON.parse(readFileSync(outPath, 'utf-8'))

    expect(result.schemaVersion).toBe('1.0.0')
    expect(result.runs).toHaveLength(5)
    expect(result.aggregate.runsTotal).toBe(5)
    expect(result.aggregate.leitfadenCoreRunsTotal).toBe(4)
    expect(result.aggregate.validEvidenceRate).toBe(1)
    expect(result.aggregate.navH3Pass).toBe(false)
  })

  it('computes taskCompletionRate correctly', () => {
    const outPath = join(TMP, 'eval-wave-1.json')
    const result = JSON.parse(readFileSync(outPath, 'utf-8'))
    expect(result.aggregate.runsTaskCompleted).toBe(1)
    expect(result.aggregate.taskCompletionRate).toBeCloseTo(0.2, 1)
  })

  it('derives H1 as supported when meanFriction >= 6', () => {
    const outPath = join(TMP, 'eval-wave-1.json')
    const result = JSON.parse(readFileSync(outPath, 'utf-8'))
    const h1 = result.hypotheses.find((h: { id: string }) => h.id === 'H1')
    expect(h1.verdict).toBe('supported')
  })

  it('derives H2 as supported when confusion keywords present', () => {
    const outPath = join(TMP, 'eval-wave-1.json')
    const result = JSON.parse(readFileSync(outPath, 'utf-8'))
    const h2 = result.hypotheses.find((h: { id: string }) => h.id === 'H2')
    expect(h2.verdict).toBe('supported')
  })

  it('derives H3 as supported when nav fails', () => {
    const outPath = join(TMP, 'eval-wave-1.json')
    const result = JSON.parse(readFileSync(outPath, 'utf-8'))
    const h3 = result.hypotheses.find((h: { id: string }) => h.id === 'H3')
    expect(h3.verdict).toBe('supported')
  })

  it('produces soft scores Q1-Q7', () => {
    const outPath = join(TMP, 'eval-wave-1.json')
    const result = JSON.parse(readFileSync(outPath, 'utf-8'))
    expect(result.softScores.Q1_nuetzlichkeit.value).toBeGreaterThanOrEqual(1)
    expect(result.softScores.Q1_nuetzlichkeit.value).toBeLessThanOrEqual(5)
    expect(result.softScores.Q4_auffindbarkeit.value).toBe(2)
    expect(result.softScores.Q7_gesamteindruck.scale).toBe('1-6_schulnote')
  })
})

describe('compare-ebm-evaluations.mjs', () => {
  const baselinePath = join(ROOT, 'knowledge', 'ebm-produktkombinationen-evaluation-audion-2026-08-04-pathfind.json')
  const waveDir = join(TMP, '2099-01-01', 'wave-1')
  const evalPath = join(TMP, 'eval-wave-1.json')
  const compPath = join(TMP, 'comparison.json')

  beforeAll(() => {
    mkdirSync(waveDir, { recursive: true })
    writeFileSync(join(waveDir, 'run-A-erstkontakt.json'), JSON.stringify(makeRunJson()))
    writeFileSync(join(waveDir, 'run-B-aufgabe1-nachruesten.json'), JSON.stringify(makeRunJson()))
    writeFileSync(join(waveDir, 'run-C-aufgabe2-kombination.json'), JSON.stringify(makeRunJson()))
    writeFileSync(join(waveDir, 'run-Nav-home-to-tool.json'), JSON.stringify(makeNavRunJson(false)))
    writeFileSync(join(waveDir, 'run-B-aufgabe1-purchase-intent.json'), JSON.stringify(makeRunJson()))

    execSync(`node scripts/aggregate-ebm-evaluation.mjs --dir "${waveDir}" --out "${evalPath}"`, { cwd: ROOT })
  })

  afterAll(() => {
    rmSync(TMP, { recursive: true, force: true })
  })

  it('produces comparison JSON with kpiTable', () => {
    execSync(`node scripts/compare-ebm-evaluations.mjs --baseline "${baselinePath}" --waves "${evalPath}" --out "${compPath}"`, { cwd: ROOT })
    const result = JSON.parse(readFileSync(compPath, 'utf-8'))

    expect(result.baselineWaveId).toBeTruthy()
    expect(result.waveIds).toHaveLength(1)
    expect(result.kpiTable.taskCompletionRate).toBeDefined()
    expect(result.kpiTable.meanFrictionValidOnly).toBeDefined()
  })

  it('computes deltas vs baseline', () => {
    const result = JSON.parse(readFileSync(compPath, 'utf-8'))
    expect(typeof result.kpiTable.taskCompletionRate.delta).toBe('number')
    expect(typeof result.kpiTable.meanFrictionValidOnly.delta).toBe('number')
  })

  it('includes hypothesis stability', () => {
    const result = JSON.parse(readFileSync(compPath, 'utf-8'))
    expect(result.hypothesisTable.H1).toBeDefined()
    expect(typeof result.hypothesisTable.H1.stable).toBe('boolean')
  })

  it('includes run stability with friction variance', () => {
    const result = JSON.parse(readFileSync(compPath, 'utf-8'))
    expect(result.runStability['A-erstkontakt']).toBeDefined()
    expect(typeof result.runStability['A-erstkontakt'].stddev).toBe('number')
  })

  it('includes soft score comparison', () => {
    const result = JSON.parse(readFileSync(compPath, 'utf-8'))
    expect(result.softScoreTable.Q1_nuetzlichkeit).toBeDefined()
    expect(typeof result.softScoreTable.Q1_nuetzlichkeit.delta).toBe('number')
  })
})

describe('run-ebm-batch.sh dry run', () => {
  it('prints payloads without POSTing when EBM_DRY_RUN=1', () => {
    const out = execSync('EBM_DRY_RUN=1 bash scripts/run-ebm-batch.sh 2>&1 || true', { cwd: ROOT, encoding: 'utf-8', timeout: 15000 })
    expect(out).toContain('DRY_RUN')
    expect(out).toContain('A-erstkontakt')
    expect(out).toContain('B-aufgabe1-nachruesten')
  })
})
