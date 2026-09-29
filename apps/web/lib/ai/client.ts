/**
 * Native OpenAI client for audion-v3 (no V2 proxy).
 * Spec twin: knowledge/ai-native-2026.md
 * Chat completions may use OpenRouter — specs/domain/persona-chat-model-tier.md
 */

import OpenAI from 'openai'
import { paths } from '../paths'

export function getOpenAiApiKey(): string {
  return process.env[paths.envOpenAiApiKey]?.trim() || ''
}

export function getOpenAiBaseUrl(): string | undefined {
  const base = process.env[paths.envOpenAiApiBaseUrl]?.trim()
  return base || undefined
}

export function getOpenRouterApiKey(): string {
  return process.env[paths.envOpenRouterApiKey]?.trim() || ''
}

/**
 * OpenAI-SDK base for chat completions / embeddings.
 * Coolify often sets `OPENROUTER_API_BASE_URL=https://openrouter.ai` for Jev
 * (`{base}/api/alpha/decisions`). The OpenAI client needs `{origin}/api/v1`.
 */
export function getOpenRouterApiBaseUrl(): string {
  const raw = (
    process.env[paths.envOpenRouterApiBaseUrl]?.trim() ||
    paths.openRouterApiDefaultBase
  ).replace(/\/$/, '')
  if (!raw) return paths.openRouterApiDefaultBase
  if (/\/api\/v1$/i.test(raw)) return raw
  return `${raw}/api/v1`
}

export function getAiOpenAiModel(): string {
  return trimEnvModelId(process.env[paths.envAiOpenAiModel]) || paths.aiOpenAiModel
}

function trimEnvModelId(raw: string | undefined): string {
  let v = (raw ?? '').trim()
  // Coolify sometimes stores values with surrounding quotes when is_literal=true.
  if (
    (v.startsWith("'") && v.endsWith("'")) ||
    (v.startsWith('"') && v.endsWith('"'))
  ) {
    v = v.slice(1, -1).trim()
  }
  return v
}

export function getAiOpenAiImageModel(): string {
  return (
    trimEnvModelId(process.env[paths.envAiOpenAiImageModel]) || paths.aiOpenAiImageModel
  )
}

/** Completion token cap for native persona chat — override via AI_CHAT_MAX_TOKENS. */
export function getChatCompletionMaxTokens(opts?: { elicitation?: boolean }): number {
  const raw = process.env[paths.envAiChatMaxTokens]?.trim()
  if (raw) {
    const n = Number.parseInt(raw, 10)
    if (Number.isFinite(n) && n > 0) return Math.min(n, 4096)
  }
  if (opts?.elicitation) return paths.chatElicitationMaxTokens
  return paths.chatCompletionMaxTokens
}

export function hasOpenAiApiKey(): boolean {
  return Boolean(getOpenAiApiKey())
}

export function hasChatCompletionCredentials(): boolean {
  return Boolean(getOpenRouterApiKey() || getOpenAiApiKey())
}

export type ChatCompletionTransport = 'openrouter' | 'openai'

/**
 * Prefer OpenRouter for persona chat when OR key is set (Qwen + openai/* slugs).
 * Images/assist keep `createOpenAiClient()` on Direct OpenAI.
 */
export function resolveChatCompletionTransport(): ChatCompletionTransport {
  return getOpenRouterApiKey() ? 'openrouter' : 'openai'
}

/**
 * Normalize allowlisted model ids for the active chat transport.
 * Bare `gpt-*` → `openai/gpt-*` on OpenRouter.
 */
export function normalizeChatModelId(
  model: string,
  transport: ChatCompletionTransport = resolveChatCompletionTransport(),
): string {
  const m = trimEnvModelId(model)
  if (!m) return m
  if (transport !== 'openrouter') return m
  if (m.includes('/')) return m
  if (/^gpt-/i.test(m) || /^o\d/i.test(m) || /^chatgpt-/i.test(m)) {
    return `openai/${m}`
  }
  return m
}

/** Create a server-side OpenAI client (Direct OpenAI — images / assist). Throws if key missing. */
export function createOpenAiClient(): OpenAI {
  const apiKey = getOpenAiApiKey()
  if (!apiKey) {
    throw new Error(`${paths.envOpenAiApiKey} is not set`)
  }
  return new OpenAI({
    apiKey,
    baseURL: getOpenAiBaseUrl(),
  })
}

/**
 * Chat completions client — OpenRouter preferred, Direct OpenAI fallback.
 * Spec: specs/domain/persona-chat-model-tier.md § Chat transport
 */
export function createChatCompletionClient(): OpenAI {
  const orKey = getOpenRouterApiKey()
  if (orKey) {
    return new OpenAI({
      apiKey: orKey,
      baseURL: getOpenRouterApiBaseUrl(),
      defaultHeaders: {
        'HTTP-Referer': 'https://audion.msq.dx',
        'X-Title': paths.defaultDisplayName || 'AUDION',
      },
    })
  }
  return createOpenAiClient()
}

export type AiNativeError = { error: string; status: number; detail?: string }

export function toAiNativeError(error: unknown, fallback = 'Native AI failed'): AiNativeError {
  if (error && typeof error === 'object' && 'status' in error) {
    const status = Number((error as { status?: number }).status) || 502
    const rec = error as Record<string, unknown>
    const message =
      error instanceof Error
        ? error.message
        : typeof rec.message === 'string'
          ? rec.message
          : fallback
    return { error: fallback, status, detail: message }
  }
  return {
    error: fallback,
    status: 502,
    detail: error instanceof Error ? error.message : String(error),
  }
}
