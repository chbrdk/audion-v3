import {
  jevModelId,
  jevTimeoutMs,
  openRouterApiBaseUrl,
  openRouterApiKey,
} from '@/lib/jev/env'
import type {
  JevChoiceAnswer,
  JevDecisionResult,
  JevNoulAnswer,
  JevQuestions,
  JevScoreAnswer,
} from '@/lib/jev/types'

export class JevClientError extends Error {
  constructor(
    message: string,
    readonly code: 'unconfigured' | 'upstream' | 'timeout' | 'invalid',
  ) {
    super(message)
  }
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {}
}

function parseChoice(raw: unknown): JevChoiceAnswer | null {
  const o = asRecord(raw)
  const key =
    typeof o.key === 'string'
      ? o.key
      : typeof o.value === 'string'
        ? o.value
        : typeof o.choice === 'string'
          ? o.choice
          : null
  if (!key) return null
  const probabilities =
    o.probabilities && typeof o.probabilities === 'object'
      ? (o.probabilities as Record<string, number>)
      : undefined
  const confidence =
    typeof o.confidence === 'number' ? o.confidence : undefined
  return { key, probabilities, confidence }
}

function parseNoul(raw: unknown): JevNoulAnswer | null {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return { probability: raw }
  }
  const o = asRecord(raw)
  const probability =
    typeof o.noul === 'number'
      ? o.noul
      : typeof o.probability === 'number'
        ? o.probability
        : typeof o.p === 'number'
          ? o.p
          : typeof o.yes === 'number'
            ? o.yes
            : null
  if (probability == null) return null
  return {
    probability,
    confidence: typeof o.confidence === 'number' ? o.confidence : undefined,
  }
}

function parseScore(raw: unknown): JevScoreAnswer | null {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return { score: raw }
  }
  const o = asRecord(raw)
  const score =
    typeof o.score === 'number'
      ? o.score
      : typeof o.value === 'number'
        ? o.value
        : null
  if (score == null) return null
  return {
    score,
    probabilities:
      o.probabilities && typeof o.probabilities === 'object'
        ? (o.probabilities as Record<string, number>)
        : undefined,
    confidence: typeof o.confidence === 'number' ? o.confidence : undefined,
  }
}

export function parseDecisionsResponse(
  body: unknown,
  latencyMs: number,
): JevDecisionResult {
  const root = asRecord(body)
  const model =
    typeof root.model === 'string' ? root.model : jevModelId()

  const choicesRaw = asRecord(root.choices ?? root.choice)
  const noulsRaw = asRecord(root.nouls ?? root.noul)
  const scoresRaw = asRecord(root.scores ?? root.score)

  // Some gateways nest under `answers` / `decisions`
  const answers = asRecord(root.answers ?? root.decisions)
  const choices: Record<string, JevChoiceAnswer> = {}
  const nouls: Record<string, JevNoulAnswer> = {}
  const scores: Record<string, JevScoreAnswer> = {}

  for (const [k, v] of Object.entries(choicesRaw)) {
    const c = parseChoice(v)
    if (c) choices[k] = c
  }
  for (const [k, v] of Object.entries(noulsRaw)) {
    const n = parseNoul(v)
    if (n) nouls[k] = n
  }
  for (const [k, v] of Object.entries(scoresRaw)) {
    const s = parseScore(v)
    if (s) scores[k] = s
  }

  // OpenRouter Decisions returns a flat `answers` map with typed entries
  for (const [k, v] of Object.entries(answers)) {
    if (choices[k] || nouls[k] || scores[k]) continue
    const typed = asRecord(v).type
    if (typed === 'choice') {
      const c = parseChoice(v)
      if (c) choices[k] = c
      continue
    }
    if (typed === 'noul') {
      const n = parseNoul(v)
      if (n) nouls[k] = n
      continue
    }
    if (typed === 'score') {
      const s = parseScore(v)
      if (s) scores[k] = s
      continue
    }
    const c = parseChoice(v)
    if (c) {
      choices[k] = c
      continue
    }
    const n = parseNoul(v)
    if (n) {
      nouls[k] = n
      continue
    }
    const s = parseScore(v)
    if (s) scores[k] = s
  }

  const usageRoot = asRecord(root.usage)
  const cost =
    typeof usageRoot.cost === 'number'
      ? usageRoot.cost
      : typeof root.cost === 'number'
        ? root.cost
        : undefined
  const promptTokens =
    typeof usageRoot.input_tokens === 'number'
      ? usageRoot.input_tokens
      : typeof usageRoot.prompt_tokens === 'number'
        ? usageRoot.prompt_tokens
        : typeof usageRoot.promptTokens === 'number'
          ? usageRoot.promptTokens
          : undefined

  return {
    model,
    choices,
    nouls,
    scores,
    usage: { cost, promptTokens },
    latencyMs,
    raw: body,
  }
}

export type CreateDecisionsInput = {
  state: unknown
  questions: JevQuestions
  model?: string
  fetchImpl?: typeof fetch
  signal?: AbortSignal
}

/**
 * OpenRouter Decisions API — System One / Jev.
 * Spec: specs/domain/jev-decisions.md
 */
export async function createJevDecisions(
  input: CreateDecisionsInput,
): Promise<JevDecisionResult> {
  const key = openRouterApiKey()
  if (!key) {
    throw new JevClientError('OPENROUTER_API_KEY missing', 'unconfigured')
  }

  const base = openRouterApiBaseUrl().replace(/\/$/, '')
  const url = `${base}/api/alpha/decisions`
  const model = input.model || jevModelId()
  const timeoutMs = jevTimeoutMs()
  const fetchImpl = input.fetchImpl ?? fetch

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  const started = Date.now()

  try {
    const res = await fetchImpl(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://audion.local',
        'X-Title': 'AUDION Jev shadow',
      },
      body: JSON.stringify({
        model,
        state: input.state,
        questions: input.questions,
      }),
      signal: input.signal ?? controller.signal,
    })
    const latencyMs = Date.now() - started
    const text = await res.text()
    let body: unknown = null
    try {
      body = text ? JSON.parse(text) : null
    } catch {
      throw new JevClientError(`invalid JSON (${res.status})`, 'invalid')
    }
    if (!res.ok) {
      throw new JevClientError(
        `upstream ${res.status}: ${text.slice(0, 200)}`,
        'upstream',
      )
    }
    return parseDecisionsResponse(body, latencyMs)
  } catch (err) {
    if (err instanceof JevClientError) throw err
    if (err instanceof Error && err.name === 'AbortError') {
      throw new JevClientError('timeout', 'timeout')
    }
    throw new JevClientError(
      err instanceof Error ? err.message : 'unknown',
      'upstream',
    )
  } finally {
    clearTimeout(timer)
  }
}
