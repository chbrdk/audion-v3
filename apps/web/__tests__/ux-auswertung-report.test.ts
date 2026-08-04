import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { buildEbmAuswertungMarkdown } from '../lib/ux-auswertung-report'

function loadPathfindJson() {
  const candidates = [
    resolve(__dirname, '../../../knowledge/ebm-produktkombinationen-evaluation-audion-2026-08-04-pathfind.json'),
    resolve(process.cwd(), 'knowledge/ebm-produktkombinationen-evaluation-audion-2026-08-04-pathfind.json'),
    resolve(process.cwd(), '../../knowledge/ebm-produktkombinationen-evaluation-audion-2026-08-04-pathfind.json'),
  ]
  for (const c of candidates) {
    try {
      return JSON.parse(readFileSync(c, 'utf8'))
    } catch {
      /* try next */
    }
  }
  throw new Error('pathfind evaluation JSON not found')
}

describe('ux-auswertung-report (Testbirds-parallel)', () => {
  it('renders hypotheses Soft-Q and runs from pathfind evaluation JSON', () => {
    const doc = loadPathfindJson()
    expect(doc.runs?.length).toBeGreaterThan(0)
    const md = buildEbmAuswertungMarkdown(doc)
    expect(md).toMatch(/Auswertung UX Test/)
    expect(md).toMatch(/## Validierung Hypothesen/)
    expect(md).toMatch(/## Soft-Q/)
    expect(md).toMatch(/Q2_bedienbarkeit/)
    expect(md).toMatch(/## Job-IDs/)
    expect(md).toMatch(/B-aufgabe1-nachruesten/)
    expect(md).toMatch(/deeplinkCheatRate/)
  })

  it('ampel-maps partial verdicts and lists personas', () => {
    const md = buildEbmAuswertungMarkdown({
      schemaVersion: '1.0.0',
      waveId: 'wave-test',
      studyId: 'study-test',
      evaluatedAt: '2026-08-04T12:00:00Z',
      method: 'audion_ux_journey_agent',
      runs: [
        {
          runId: 'B-aufgabe1',
          persona: 'Alex Lab',
          steps: 5,
          frictionScore: 8,
          validEvidence: true,
          goalReached: false,
          deeplinkCheat: false,
          jobId: 'job-1',
          finding: 'grau disabled',
        },
      ],
      hypotheses: [
        {
          id: 'H2',
          statement: 'Filter unklar',
          verdict: 'partially_supported',
          confidence: 0.8,
          rationale: 'grau',
        },
      ],
      softScores: {
        basis: 'Think-Aloud draft',
        Q2_bedienbarkeit: { scale: '1-5', value: 2, confidence: 0.7, rationale: 'Auto-draft' },
      },
      aggregate: { deeplinkCheatRate: 0, navH3Pass: false },
    })
    expect(md).toMatch(/🟡/)
    expect(md).toMatch(/Alex Lab/)
    expect(md).toMatch(/\| Q2_bedienbarkeit \| 2 \|/)
  })
})
