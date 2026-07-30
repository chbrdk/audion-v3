/** Soft-Q score display helpers (numeric vs categorical string values). */

export type SoftScoreDisplay =
  | { kind: 'empty'; text: '—' }
  | { kind: 'number'; text: string; numeric: number }
  | { kind: 'text'; text: string }

export function formatSoftScoreValue(value: number | string | null | undefined): SoftScoreDisplay {
  if (value == null || value === '') return { kind: 'empty', text: '—' }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return { kind: 'number', text: String(value), numeric: value }
  }
  const raw = String(value).trim()
  if (!raw) return { kind: 'empty', text: '—' }
  const asNum = Number(raw)
  if (raw !== '' && Number.isFinite(asNum) && /^-?\d+(\.\d+)?$/.test(raw)) {
    return { kind: 'number', text: raw, numeric: asNum }
  }
  return {
    kind: 'text',
    text: raw.replace(/_/g, ' '),
  }
}

export type SoftScoreScaleOptions = {
  kind: 'numeric' | 'text'
  options: Array<{ value: string; label: string }>
  min?: number
  max?: number
}

/** Map SoftScoreEntry.scale → editor options (`1-5`, `1-6_schulnote`, `choice`, …). */
export function softScoreScaleOptions(scale: string | null | undefined): SoftScoreScaleOptions {
  const raw = (scale ?? '').trim().toLowerCase()
  const range = raw.match(/^(\d+)\s*[-–]\s*(\d+)/)
  if (range) {
    const min = Number(range[1])
    const max = Number(range[2])
    if (Number.isFinite(min) && Number.isFinite(max) && max >= min) {
      const options = [{ value: '', label: '—' }]
      for (let n = min; n <= max; n += 1) {
        options.push({ value: String(n), label: String(n) })
      }
      return { kind: 'numeric', options, min, max }
    }
  }
  return { kind: 'text', options: [] }
}

/** Persist value from editor string; empty → null; numeric scales coerce to number. */
export function parseSoftScoreValueInput(
  raw: string,
  scale: string | null | undefined,
): number | string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const scaleOpts = softScoreScaleOptions(scale)
  if (scaleOpts.kind === 'numeric') {
    const n = Number(trimmed)
    if (!Number.isFinite(n)) return trimmed
    const min = scaleOpts.min ?? n
    const max = scaleOpts.max ?? n
    return Math.min(max, Math.max(min, n))
  }
  return trimmed
}

/** Confidence UI is percent 0–100; store is 0–1. */
export function confidenceToPercent(confidence: number): string {
  if (!Number.isFinite(confidence)) return '0'
  return String(Math.round(Math.min(1, Math.max(0, confidence)) * 100))
}

export function parseConfidencePercentInput(raw: string): number | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const n = Number(trimmed)
  if (!Number.isFinite(n)) return null
  return Math.min(1, Math.max(0, n / 100))
}
