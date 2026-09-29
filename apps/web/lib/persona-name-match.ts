/**
 * Fuzzy persona name matching for list search (assistant / hub).
 * Tolerates minor typos (e.g. Reinhard ↔ Reinhardt) and partial tokens.
 */

function normalizeName(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9äöüß\s-]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  const rows = a.length + 1
  const cols = b.length + 1
  const prev = new Array<number>(cols)
  const curr = new Array<number>(cols)
  for (let j = 0; j < cols; j++) prev[j] = j
  for (let i = 1; i < rows; i++) {
    curr[0] = i
    const ca = a.charCodeAt(i - 1)
    for (let j = 1; j < cols; j++) {
      const cost = ca === b.charCodeAt(j - 1) ? 0 : 1
      curr[j] = Math.min(prev[j]! + 1, curr[j - 1]! + 1, prev[j - 1]! + cost)
    }
    for (let j = 0; j < cols; j++) prev[j] = curr[j]!
  }
  return prev[b.length]!
}

function tokenClose(queryToken: string, nameToken: string): boolean {
  if (!queryToken || !nameToken) return false
  if (nameToken.includes(queryToken) || queryToken.includes(nameToken)) return true
  const maxDist = queryToken.length <= 4 ? 1 : 2
  return levenshtein(queryToken, nameToken) <= maxDist
}

/** True when `candidate` (name/role/…) matches search `query`. */
export function personaTextMatchesQuery(candidate: string, query: string): boolean {
  const q = normalizeName(query)
  if (!q) return true
  const hay = normalizeName(candidate)
  if (!hay) return false
  if (hay.includes(q) || q.includes(hay)) return true

  const qTokens = q.split(' ').filter(Boolean)
  const nTokens = hay.split(' ').filter(Boolean)
  if (qTokens.length === 0) return true
  return qTokens.every((qt) => nTokens.some((nt) => tokenClose(qt, nt)))
}

export function personaRecordMatchesQuery(
  record: { name?: string | null; role?: string | null; archetype?: string | null },
  query: string,
): boolean {
  const q = query.trim()
  if (!q) return true
  return [record.name, record.role, record.archetype].some(
    (value) => typeof value === 'string' && personaTextMatchesQuery(value, q),
  )
}
