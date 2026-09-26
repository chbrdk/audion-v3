/**
 * Fire-and-forget usage events to Plexon.
 * Prefer real provider tokens; never silent default proxies (e.g. chat.message.stream → 10).
 * Spec: knowledge/plexon-federation.md · plexon knowledge/usage-tracking.md
 */
import { AsyncLocalStorage } from 'node:async_hooks'
import {
  getPlexonAuthUrl,
  getPlexonServiceSecret,
  isPlexonAuthConfigured,
} from './runtime-config'
import { getPlexonContractHeaders } from './plexon-contract'

export type UsageReportParams = {
  userId: string
  eventType: string
  rawUnits: Record<string, unknown>
  idempotencyKey?: string
}

export type LlmTokenUsage = {
  input_tokens: number
  output_tokens: number
  /** True when usage was estimated (no vendor usage block). */
  estimated?: boolean
  model?: string
}

const usageUserStore = new AsyncLocalStorage<string | null>()

/** Bind billing user for nested LLM/Jev/RAG calls in this request. */
export function runWithUsageUserId<T>(userId: string | null | undefined, fn: () => T): T {
  return usageUserStore.run(userId?.trim() || null, fn)
}

export function getUsageUserId(): string | null {
  return usageUserStore.getStore() ?? null
}

export function isUsageReportingConfigured(): boolean {
  return isPlexonAuthConfigured()
}

/** Fire-and-forget usage event to Plexon. Never throws. */
export function reportUsage(params: UsageReportParams): void {
  try {
    if (!isPlexonAuthConfigured()) return
    if (!params?.userId || !params?.eventType) return
    const url = `${getPlexonAuthUrl().replace(/\/$/, '')}/api/services/usage/events`
    const body = {
      user_id: params.userId,
      service: 'audion' as const,
      event_type: params.eventType,
      raw_units: params.rawUnits ?? {},
      ...(params.idempotencyKey ? { idempotency_key: params.idempotencyKey } : {}),
    }
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getPlexonContractHeaders(getPlexonServiceSecret()),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    }).catch((e) => {
      console.warn('[AUDION-v3] usage report failed:', e?.message ?? e)
    })
  } catch (e) {
    console.warn('[AUDION-v3] usage report setup failed:', e instanceof Error ? e.message : e)
  }
}

/** Prefer vendor usage; otherwise rough char/4 estimate (marked estimated). */
export function parseOpenAiUsage(
  usage: unknown,
  fallback?: { system?: string; user?: string; content?: string; model?: string },
): LlmTokenUsage {
  const u = usage && typeof usage === 'object' ? (usage as Record<string, unknown>) : null
  const prompt =
    typeof u?.prompt_tokens === 'number'
      ? u.prompt_tokens
      : typeof u?.input_tokens === 'number'
        ? u.input_tokens
        : null
  const completion =
    typeof u?.completion_tokens === 'number'
      ? u.completion_tokens
      : typeof u?.output_tokens === 'number'
        ? u.output_tokens
        : null

  if (prompt != null || completion != null) {
    return {
      input_tokens: Math.max(0, Math.floor(prompt ?? 0)),
      output_tokens: Math.max(0, Math.floor(completion ?? 0)),
      model: fallback?.model,
    }
  }

  const inChars = (fallback?.system?.length ?? 0) + (fallback?.user?.length ?? 0)
  const outChars = fallback?.content?.length ?? 0
  return {
    input_tokens: Math.max(1, Math.ceil(inChars / 4)),
    output_tokens: Math.max(1, Math.ceil(outChars / 4) || 1),
    estimated: true,
    model: fallback?.model,
  }
}

export function reportLlmUsage(input: {
  userId?: string | null
  usage: LlmTokenUsage
  surface?: string
  idempotencyKey?: string
}): void {
  const userId = input.userId?.trim() || getUsageUserId()
  if (!userId) return
  if (input.usage.input_tokens <= 0 && input.usage.output_tokens <= 0) return
  reportUsage({
    userId,
    eventType: 'llm_request',
    rawUnits: {
      input_tokens: input.usage.input_tokens,
      output_tokens: input.usage.output_tokens,
      ...(input.usage.estimated ? { estimated: true } : {}),
      ...(input.usage.model ? { model: input.usage.model } : {}),
      ...(input.surface ? { surface: input.surface } : {}),
    },
    idempotencyKey: input.idempotencyKey,
  })
}

/** Vendor USD (OpenRouter Decisions / etc.) → Plexon vendor_cost. */
export function reportVendorCostUsd(input: {
  userId?: string | null
  costUsd: number
  surface?: string
  model?: string
  idempotencyKey?: string
}): void {
  const userId = input.userId?.trim() || getUsageUserId()
  if (!userId) return
  const cost = Number(input.costUsd)
  if (!Number.isFinite(cost) || cost < 0) return
  reportUsage({
    userId,
    eventType: 'vendor_cost',
    rawUnits: {
      cost_usd: cost,
      ...(input.surface ? { surface: input.surface } : {}),
      ...(input.model ? { model: input.model } : {}),
    },
    idempotencyKey: input.idempotencyKey,
  })
}

export function reportRetrievalQuery(input: {
  userId?: string | null
  queries?: number
  projectId?: string
  surface?: string
}): void {
  const userId = input.userId?.trim() || getUsageUserId()
  if (!userId) return
  reportUsage({
    userId,
    eventType: 'retrieval_query',
    rawUnits: {
      queries: Math.max(1, Math.floor(input.queries ?? 1)),
      ...(input.projectId ? { project_id: input.projectId } : {}),
      ...(input.surface ? { surface: input.surface } : {}),
    },
  })
}
