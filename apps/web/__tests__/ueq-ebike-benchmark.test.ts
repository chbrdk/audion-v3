import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(__dirname, '..', '..', '..')
const outJson = path.join(root, 'knowledge/ueq-ebike-benchmark-2026-08-19.json')

describe('UEQ eBike benchmark artifacts', () => {
  it('benchmark JSON exists with aggregates', () => {
    expect(fs.existsSync(outJson)).toBe(true)
    const report = JSON.parse(fs.readFileSync(outJson, 'utf8'))
    expect(report.meta.run_count).toBeGreaterThan(0)
    expect(report.aggregates.overall.weighted_mean).toBeGreaterThan(0)
    expect(report.aggregates.overall.weighted_mean).toBeLessThanOrEqual(7)
    expect(Object.keys(report.aggregates.by_use_case)).toContain('UC1')
  })

  it('infer script path exists', () => {
    const script = path.join(root, 'scripts/infer-ueq-ebike-scores.py')
    expect(fs.existsSync(script)).toBe(true)
  })

  it('human vs AI comparison JSON exists', () => {
    const cmp = path.join(root, 'knowledge/ueq-ebike-human-vs-ai-2026-08-19.json')
    expect(fs.existsSync(cmp)).toBe(true)
    const report = JSON.parse(fs.readFileSync(cmp, 'utf8'))
    expect(report.comparison.overall.human_ueq).toBeGreaterThan(0)
    expect(report.comparison.dimensions.effizienz).toBeDefined()
  })

  it('AI voices human-format JSON exists', () => {
    const voices = path.join(root, 'knowledge/ueq-ebike-ai-voices-2026-08-19.json')
    expect(fs.existsSync(voices)).toBe(true)
    const data = JSON.parse(fs.readFileSync(voices, 'utf8'))
    expect(data.voices.length).toBe(6)
    expect(data.voices[0].quote.length).toBeGreaterThan(80)
  })

  it('infer script defaults to luna not gpt-4o', () => {
    const script = path.join(root, 'scripts/infer-ueq-ebike-scores.py')
    const src = fs.readFileSync(script, 'utf8')
    expect(src).toContain('gpt-5.6-luna')
    expect(src).not.toMatch(/["']gpt-4o-mini["']/)
  })

  it('fail-bucket script and luna-vision knowledge exist', () => {
    expect(fs.existsSync(path.join(root, 'scripts/bucket-ux-journey-fail-reasons.py'))).toBe(true)
    expect(fs.existsSync(path.join(root, 'knowledge/ux-agent-luna-vision-2026-08-20.md'))).toBe(true)
  })
})
