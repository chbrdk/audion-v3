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
