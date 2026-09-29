/**
 * Persona chat completion model tier — heuristic only (Jev unwired from chat).
 * Spec: specs/domain/persona-chat-model-tier.md
 */
import {
  isGreetingMessage,
  isResearchElicitationMessage,
} from '@/lib/chat/adaptive-persona-chat-prompt'
import { getAiOpenAiModel, normalizeChatModelId } from '@/lib/ai/client'
import { PERSONA_CHAT_MODEL_TIER_OPTIONS } from '@/lib/jev/catalog'
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

/** Heuristic — greeting low, elicitation high, else mid. */
export function heuristicPersonaChatModelTier(message: string): PersonaChatModelTier {
  if (isGreetingMessage(message)) return 'low'
  if (isResearchElicitationMessage(message)) return 'high'
  return 'mid'
}

export function isPersonaChatModelTier(v: unknown): v is PersonaChatModelTier {
  return typeof v === 'string' && TIER_SET.has(v)
}

/** Map tier → allowlisted model id (never invent IDs). Normalized for chat transport. */
export function modelIdForPersonaChatTier(tier: PersonaChatModelTier): string {
  const mid = getAiOpenAiModel()
  let raw = mid
  if (tier === 'low') {
    raw =
      trimModelEnv(process.env[paths.envAiOpenAiModelChatLow]) ||
      paths.aiOpenAiModelChatLow ||
      mid
  } else if (tier === 'high') {
    raw =
      trimModelEnv(process.env[paths.envAiOpenAiModelChatHigh]) ||
      paths.aiOpenAiModelChatHigh ||
      mid
  }
  return normalizeChatModelId(raw)
}

export type ResolvePersonaChatModelResult = {
  tier: PersonaChatModelTier
  model: string
  /** Reserved — was Jev Act override; always false while Jev is off chat. */
  applied: boolean
  source: 'heuristic'
}

/**
 * Resolve completion model from message heuristic only.
 * Jev shadow/act intentionally not called on the chat path (2026-09-29).
 */
export async function resolvePersonaChatModel(
  message: string,
  _opts?: { fetchImpl?: typeof fetch; userId?: string | null },
): Promise<ResolvePersonaChatModelResult> {
  const tier = heuristicPersonaChatModelTier(message)
  return {
    tier,
    model: modelIdForPersonaChatTier(tier),
    applied: false,
    source: 'heuristic',
  }
}
