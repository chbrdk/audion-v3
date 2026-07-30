/**
 * Native OpenAI client for audion-v3 (no V2 proxy).
 * Spec twin: knowledge/ai-native-2026.md
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

export function getAiOpenAiModel(): string {
  return process.env[paths.envAiOpenAiModel]?.trim() || paths.aiOpenAiModel
}

export function getAiOpenAiImageModel(): string {
  return process.env[paths.envAiOpenAiImageModel]?.trim() || paths.aiOpenAiImageModel
}

export function hasOpenAiApiKey(): boolean {
  return Boolean(getOpenAiApiKey())
}

/** Create a server-side OpenAI client. Throws if key missing. */
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
