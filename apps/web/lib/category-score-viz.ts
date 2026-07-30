/** Helpers for UX-study category score diagrams (signed scorecard → radar + bars). */

export type CategoryScoreEntry = {
  key: string
  label: string
  shortLabel: string
  value: number
}

const SHORT_LABELS: Record<string, string> = {
  affordance: 'Affordance',
  copy: 'Copy',
  info_density: 'Density',
  layout: 'Layout',
  navigation: 'Nav',
  performance: 'Perf',
  persona_fit: 'Fit',
  trust: 'Trust',
  typography: 'Type',
  visual: 'Visual',
}

export function formatCategoryLabel(key: string): string {
  return key.replace(/_/g, ' ')
}

export function shortCategoryLabel(key: string): string {
  const normalized = key.toLowerCase().replace(/\s+/g, '_')
  return SHORT_LABELS[normalized] ?? formatCategoryLabel(key)
}

export function sortCategoryEntries(
  entries: Array<[string, number]>,
): CategoryScoreEntry[] {
  return [...entries]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, value]) => ({
      key,
      label: formatCategoryLabel(key),
      shortLabel: shortCategoryLabel(key),
      value,
    }))
}

/** Domain half-width so 0 maps to radar mid-ring; at least 1 so empty domains stay stable. */
export function categoryScoreDomain(values: number[]): number {
  const peak = values.reduce((m, v) => Math.max(m, Math.abs(v)), 0)
  return Math.max(1, peak)
}

/** Map signed score → 0..1 for spider chart (0.5 = neutral / zero). */
export function signedScoreToRadar01(value: number, domain: number): number {
  const d = domain > 0 ? domain : 1
  const n = (value + d) / (2 * d)
  if (!Number.isFinite(n)) return 0.5
  return Math.min(1, Math.max(0, n))
}

/** Bar fill width as % of half-track (0–100). */
export function signedScoreBarPct(value: number, domain: number): number {
  const d = domain > 0 ? domain : 1
  return Math.min(100, (Math.abs(value) / d) * 100)
}

export function formatSignedScore(value: number): string {
  if (value > 0) return `+${trimNum(value)}`
  return String(trimNum(value))
}

function trimNum(value: number): string {
  const rounded = Math.round(value * 100) / 100
  return Number.isInteger(rounded) ? String(rounded) : String(rounded)
}

export function radarVertex(
  index: number,
  total: number,
  value01: number,
  cx: number,
  cy: number,
  radius: number,
): { x: number; y: number } {
  const v = Math.min(1, Math.max(0, value01))
  const angle = -Math.PI / 2 + (index / Math.max(total, 1)) * Math.PI * 2
  return {
    x: cx + Math.cos(angle) * radius * v,
    y: cy + Math.sin(angle) * radius * v,
  }
}

export function radarPolygon(
  values01: number[],
  cx: number,
  cy: number,
  radius: number,
): string {
  if (!values01.length) return ''
  return values01
    .map((v, i) => {
      const { x, y } = radarVertex(i, values01.length, v, cx, cy, radius)
      return `${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')
}
