/**
 * Persona chat completion model tier — heuristic + Jev shadow/act.
 * Spec: specs/domain/persona-chat-model-tier.md
 */
import {
  isGreetingMessage,
  isResearchElicitationMessage,
} from '@/lib/chat/adaptive-persona-chat-prompt'
import { getAiOpenAiModel } from '@/lib/ai/client'
import {
  JEV_USE_CASES,
  PERSONA_CHAT_MODEL_TIER_OPTIONS,
  questionsPersonaChatModelTier,
} from '@/lib/jev/catalog'
import { isJevActEnabled } from '@/lib/jev/env'
import { resolveJevActOrShadow, scheduleJevShadow } from '@/lib/jev/schedule'
import { paths } from '@/lib/paths'

export type PersonaChatModelTier = (typeof PERSONA_CHAT_MODEL_TIER_OPTIONS)[number]

const TIER_SET = new Set<string>(PERSONA_CHAT_MODEL_TIER_OPTIONS)

function trimModelEnv(raw: string | undefined): string {
  let v = (raw ?? '').trim()
  if (
    (v.startsWith("'") && v.endsWith("'")) ||
    (v.startsWith('"') && v.endsWith('"'))
  ) {
    v = v.slice(1, -1).trim()
  }
  return v
}

/** Heuristic baseline — greeting low, elicitation high, else mid. */
export function heuristicPersonaChatModelTier(message: string): PersonaChatModelTier {
  if (isGreetingMessage(message)) return 'low'
  if (isResearchElicitationMessage(message)) return 'high'
  return 'mid'
}

export function isPersonaChatModelTier(v: unknown): v is PersonaChatModelTier {
  return typeof v === 'string' && TIER_SET.has(v)
}

/** Map tier → allowlisted model id (never invent IDs). */
export function modelIdForPersonaChatTier(tier: PersonaChatModelTier): string {
  const mid = getAiOpenAiModel()
  if (tier === 'mid') return mid
  if (tier === 'low') {
    return (
      trimModelEnv(process.env[paths.envAiOpenAiModelChatLow]) ||
      paths.aiOpenAiModelChatLow ||
      mid
    )
  }
  return (
    trimModelEnv(process.env[paths.envAiOpenAiModelChatHigh]) ||
    paths.aiOpenAiModelChatHigh ||
    mid
  )
}

function logJevAct(payload: Record<string, unknown>): void {
  try {
    console.info('[jev-act]', JSON.stringify(payload))
  } catch {
    /* ignore */
  }
}

export type ResolvePersonaChatModelResult = {
  tier: PersonaChatModelTier
  model: string
  /** True when Act overrode the default mid model path. */
  applied: boolean
  source: 'heuristic' | 'jev-act' | 'default'
}

/**
 * Shadow: fire-and-forget, model stays default mid.
 * Act: await Jev Choice and map to allowlisted model (fail-open → heuristic tier).
 */
export async function resolvePersonaChatModel(
  message: string,
  opts?: { fetchImpl?: typeof fetch; userId?: string | null },
): Promise<ResolvePersonaChatModelResult> {
  const baseline = heuristicPersonaChatModelTier(message)
  const useCaseId = JEV_USE_CASES.audionPersonaChatModelTier
  const state = {
    message: message.trim().slice(0, 2000),
    greeting: isGreetingMessage(message),
    elicitation: isResearchElicitationMessage(message),
    baseline,
  }

  if (!isJevActEnabled(useCaseId)) {
    scheduleJevShadow({
      useCaseId,
      state,
      questions: questionsPersonaChatModelTier(),
      baseline,
      extractChoiceKey: 'tier',
      fetchImpl: opts?.fetchImpl,
      userId: opts?.userId,
    })
    return {
      tier: baseline,
      model: getAiOpenAiModel(),
      applied: false,
      source: 'default',
    }
  }

  const compare = await resolveJevActOrShadow({
    useCaseId,
    state,
    questions: questionsPersonaChatModelTier(),
    baseline,
    extractChoiceKey: 'tier',
    fetchImpl: opts?.fetchImpl,
    userId: opts?.userId,
  })

  let tier = baseline
  let source: ResolvePersonaChatModelResult['source'] = 'heuristic'
  let applied = false
  if (compare && !compare.error && isPersonaChatModelTier(compare.jev)) {
    tier = compare.jev
    source = 'jev-act'
    applied = true
  }

  const model = modelIdForPersonaChatTier(tier)
  logJevAct({
    useCaseId,
    baseline,
    jev: compare?.jev ?? null,
    tier,
    model,
    applied,
    latencyMs: compare?.latencyMs ?? null,
  })

  return { tier, model, applied, source }
}
