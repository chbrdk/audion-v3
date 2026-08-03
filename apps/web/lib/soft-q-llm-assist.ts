/**
 * Lab L6b — optional LLM Soft-Q assist over the deterministic Think-Aloud draft.
 * Off by default (`AUDION_SOFT_Q_LLM_ASSIST=1` + OPENAI_API_KEY). Failures fall back
 * to the rule draft. Numeric values stay within ±1 of the rule draft.
 *
 * @see knowledge/lab-l6b-soft-q-llm-assist-2026-08-03.md
 */

import type { SoftScoreEntry, SoftScoreKey, UxWaveRunItem } from '@audion-v3/contracts'
import {
  createOpenAiClient,
  getAiOpenAiModel,
  hasOpenAiApiKey,
} from './ai/client'
import { paths } from './paths'
import type { SoftQDraft } from './soft-q-draft'

const SOFT_KEYS: SoftScoreKey[] = [
  'Q1_nuetzlichkeit',
  'Q2_bedienbarkeit',
  'Q3_filterlogik',
  'Q4_auffindbarkeit',
  'Q5_produktnah_vs_tool',
  'Q6_nutzungswahrscheinlichkeit',
  'Q7_gesamteindruck',
]

const NUMERIC_KEYS = new Set<SoftScoreKey>([
  'Q1_nuetzlichkeit',
  'Q2_bedienbarkeit',
  'Q3_filterlogik',
  'Q4_auffindbarkeit',
  'Q6_nutzungswahrscheinlichkeit',
  'Q7_gesamteindruck',
])

export type SoftQLlmCompleteJson = (args: {
  system: string
  user: string
  model: string
}) => Promise<unknown>

export type SoftQLlmAssistResult = {
  softScores: SoftQDraft
  applied: boolean
  note: string
}

/** Env gate — opt-in; never required for Evaluate. */
export function isSoftQLlmAssistEnabled(): boolean {
  const raw = process.env[paths.envSoftQLlmAssist]?.trim().toLowerCase()
  return raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on'
}

function clip(text: string, limit: number): string {
  const t = text.replace(/\s+/g, ' ').trim()
  if (t.length <= limit) return t
  return `${t.slice(0, Math.max(0, limit - 1)).trimEnd()}…`
}

function narrativesForPrompt(runs: UxWaveRunItem[]): string {
  const valid = runs.filter((r) => r.validEvidence === true)
  return valid
    .map((r, i) => {
      const head = `[${i + 1}] ${r.runKey} friction=${r.frictionScore ?? '—'} goal=${r.goalReached ?? '—'} steps=${r.steps ?? '—'}`
      const body = clip([r.finding, r.validEvidenceCaveat].filter(Boolean).join(' | ') || '(empty)', 600)
      return `${head}\n${body}`
    })
    .join('\n\n')
}

function extractJson(raw: string): unknown {
  const trimmed = raw.trim()
  try {
    return JSON.parse(trimmed)
  } catch {
    const start = trimmed.indexOf('{')
    const end = trimmed.lastIndexOf('}')
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1))
      } catch {
        /* fall through */
      }
    }
  }
  return null
}

async function defaultCompleteJson(args: {
  system: string
  user: string
  model: string
}): Promise<unknown> {
  const client = createOpenAiClient()
  const completion = await client.chat.completions.create({
    model: args.model,
    messages: [
      { role: 'system', content: args.system },
      { role: 'user', content: args.user },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.2,
  })
  const text = completion.choices[0]?.message?.content?.trim() || ''
  return extractJson(text)
}

function clampNearRule(
  key: SoftScoreKey,
  rule: SoftScoreEntry | undefined,
  proposed: number | string | null,
): number | string | null {
  if (proposed === null || proposed === undefined || proposed === '') {
    return rule?.value ?? null
  }
  if (!NUMERIC_KEYS.has(key)) {
    // choice / string: keep LLM only if rule had a value or LLM suggests non-null
    return typeof proposed === 'string' || typeof proposed === 'number' ? proposed : rule?.value ?? null
  }
  if (typeof proposed !== 'number' || Number.isNaN(proposed)) {
    return rule?.value ?? null
  }
  const rounded = Math.round(proposed)
  const ruleNum = typeof rule?.value === 'number' ? rule.value : null
  if (ruleNum === null) {
    // Q4 often null — allow LLM fill only if confidence path later; keep null unless 1–6ish
    if (key === 'Q4_auffindbarkeit') return null
    const max = key === 'Q7_gesamteindruck' ? 6 : 5
    return Math.max(1, Math.min(max, rounded))
  }
  const max = key === 'Q7_gesamteindruck' ? 6 : 5
  const lo = Math.max(1, ruleNum - 1)
  const hi = Math.min(max, ruleNum + 1)
  return Math.max(lo, Math.min(hi, rounded))
}

type LlmCell = {
  value?: number | string | null
  confidence?: number
  rationale?: string
}

type LlmPayload = {
  basis?: string
  scores?: Partial<Record<SoftScoreKey, LlmCell>>
}

function asLlmPayload(json: unknown): LlmPayload | null {
  if (!json || typeof json !== 'object') return null
  return json as LlmPayload
}

/**
 * Merge LLM suggestions onto a rule Soft-Q draft.
 * Pure (no network) — used by assist + tests.
 */
export function mergeLlmSoftScoreSuggestions(
  ruleDraft: SoftQDraft,
  llm: LlmPayload | null,
): SoftQDraft {
  if (!llm?.scores) {
    return ruleDraft
  }
  const out: SoftQDraft = { ...ruleDraft }
  for (const key of SOFT_KEYS) {
    const rule = ruleDraft[key]
    const cell = llm.scores[key]
    if (!cell || !rule) continue
    const value = clampNearRule(key, rule, cell.value ?? null)
    const confidence =
      typeof cell.confidence === 'number'
        ? Math.max(0, Math.min(0.9, cell.confidence))
        : Math.min(0.85, (rule.confidence ?? 0.4) + 0.08)
    const rationaleRaw =
      typeof cell.rationale === 'string' && cell.rationale.trim()
        ? cell.rationale.trim()
        : rule.rationale
    const rationale = /^(Auto-draft|LLM-assist)/i.test(rationaleRaw)
      ? rationaleRaw.replace(/^(Auto-draft|LLM-assist):\s*/i, 'LLM-assist: ')
      : `LLM-assist: ${clip(rationaleRaw, 280)}`
    out[key] = {
      scale: rule.scale,
      value,
      confidence,
      rationale,
    }
  }
  if (typeof llm.basis === 'string' && llm.basis.trim()) {
    out.basis = `LLM Soft-Q assist over Think-Aloud draft. ${clip(llm.basis, 180)}`
  } else if (ruleDraft.basis) {
    out.basis = `LLM Soft-Q assist over Think-Aloud draft. ${ruleDraft.basis}`
  }
  return out
}

/**
 * Optionally refine Soft-Q rationales/values via OpenAI.
 * Returns rule draft unchanged when disabled, no key, no valid runs, or on error.
 */
export async function assistSoftScoresWithLlm(
  ruleDraft: SoftQDraft,
  runs: UxWaveRunItem[],
  opts?: { completeJson?: SoftQLlmCompleteJson; force?: boolean },
): Promise<SoftQLlmAssistResult> {
  const enabled = opts?.force === true || isSoftQLlmAssistEnabled()
  if (!enabled) {
    return {
      softScores: ruleDraft,
      applied: false,
      note: 'Soft-Q LLM assist off (set AUDION_SOFT_Q_LLM_ASSIST=1).',
    }
  }
  if (!opts?.completeJson && !hasOpenAiApiKey()) {
    return {
      softScores: ruleDraft,
      applied: false,
      note: 'Soft-Q LLM assist skipped — OPENAI_API_KEY missing.',
    }
  }
  const valid = runs.filter((r) => r.validEvidence === true)
  if (!valid.length || !SOFT_KEYS.some((k) => ruleDraft[k])) {
    return {
      softScores: ruleDraft,
      applied: false,
      note: 'Soft-Q LLM assist skipped — no rule draft / validEvidence.',
    }
  }

  const system = [
    'You refine Soft-Q UX questionnaire drafts for a German eBike product-combinations tool study.',
    'Use ONLY the Think-Aloud findings. Do not invent UI facts.',
    'Stay close to the rule draft values (±1 max for 1–5 / Schulnote scales).',
    'Q7 is German Schulnote 1–6 (higher = worse).',
    'Q4 may stay null if navigation from home was not tested.',
    'Return JSON: { "basis": string, "scores": { "<SoftScoreKey>": { "value": number|string|null, "confidence": 0-1, "rationale": string } } }',
    `Keys: ${SOFT_KEYS.join(', ')}`,
    'Rationales: short German, cite a phrase from the findings.',
  ].join(' ')

  const user = [
    'Rule Soft-Q draft (JSON):',
    JSON.stringify(ruleDraft, null, 2),
    '',
    'validEvidence Think-Alouds:',
    narrativesForPrompt(runs),
  ].join('\n')

  try {
    const complete = opts?.completeJson ?? defaultCompleteJson
    const json = await complete({
      system,
      user,
      model: getAiOpenAiModel(),
    })
    const payload = asLlmPayload(json)
    if (!payload?.scores) {
      return {
        softScores: ruleDraft,
        applied: false,
        note: 'Soft-Q LLM assist returned unusable JSON — kept rule draft.',
      }
    }
    return {
      softScores: mergeLlmSoftScoreSuggestions(ruleDraft, payload),
      applied: true,
      note: 'Soft-Q: LLM assist refined rationales (values clamped ±1 to rule draft).',
    }
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    return {
      softScores: ruleDraft,
      applied: false,
      note: `Soft-Q LLM assist failed — kept rule draft (${clip(detail, 120)}).`,
    }
  }
}
