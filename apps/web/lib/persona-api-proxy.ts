/**
 * @deprecated V2 persona-api / chat-api HTTP proxy helpers.
 * Coolify/prod v3 uses native OpenAI (`knowledge/ai-native-2026.md`).
 * Prefer shouldPreferAiNative / ai-workflows-native.
 */

import { NextResponse } from 'next/server'
import {
  getChatApiBase,
  getPersonaBackendBase,
  shouldPreferAiNative,
  shouldRequireAiNative,
} from './runtime-config'
import { paths } from './paths'

/** Prefer native AI (`NEXT_AI_RUNTIME`). Name kept for route compatibility. */
export function shouldPreferAiLive(): boolean {
  return shouldPreferAiNative()
}

/** Fail hard when native AI unavailable (`NEXT_AI_RUNTIME=native`). */
export function shouldRequireAiLive(): boolean {
  return shouldRequireAiNative()
}

export type UpstreamFetchResult =
  | { ok: true; status: number; json: unknown }
  | { ok: false; status: number; error: string; detail?: string }

export async function fetchPersonaApi(
  path: string,
  init?: {
    method?: string
    body?: unknown
    authorization?: string | null
  },
): Promise<UpstreamFetchResult> {
  const base = getPersonaBackendBase({ preferPublic: false }).replace(/\/$/, '')
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`
  const headers = new Headers({ Accept: 'application/json' })
  if (init?.authorization) headers.set('authorization', init.authorization)
  const method = init?.method ?? 'POST'
  const requestInit: RequestInit = { method, headers, cache: 'no-store' }
  if (method !== 'GET' && method !== 'HEAD' && init?.body !== undefined) {
    headers.set('content-type', 'application/json')
    requestInit.body = JSON.stringify(init.body)
  }
  try {
    const res = await fetch(url, requestInit)
    const text = await res.text()
    let json: unknown = null
    try {
      json = text ? JSON.parse(text) : null
    } catch {
      json = { raw: text }
    }
    if (!res.ok) {
      const detail =
        typeof json === 'object' && json && 'detail' in json
          ? String((json as { detail: unknown }).detail)
          : text.slice(0, 240)
      return {
        ok: false,
        status: res.status,
        error: `Upstream ${res.status}`,
        detail: detail || undefined,
      }
    }
    return { ok: true, status: res.status, json }
  } catch (error) {
    return {
      ok: false,
      status: 502,
      error: 'Persona API unavailable',
      detail: error instanceof Error ? error.message : 'unknown',
    }
  }
}

export async function fetchChatApi(
  path: string,
  init?: {
    method?: string
    body?: unknown
    authorization?: string | null
    accept?: string
  },
): Promise<Response | { error: string; status: number; detail?: string }> {
  const base = getChatApiBase().replace(/\/$/, '')
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`
  const headers = new Headers()
  if (init?.accept) headers.set('Accept', init.accept)
  else headers.set('Accept', 'application/json')
  if (init?.authorization) headers.set('authorization', init.authorization)
  const method = init?.method ?? 'POST'
  const requestInit: RequestInit = { method, headers, cache: 'no-store' }
  if (method !== 'GET' && method !== 'HEAD' && init?.body !== undefined) {
    headers.set('content-type', 'application/json')
    requestInit.body = JSON.stringify(init.body)
  }
  try {
    return await fetch(url, requestInit)
  } catch (error) {
    return {
      error: 'Chat API unavailable',
      status: 502,
      detail: error instanceof Error ? error.message : 'unknown',
    }
  }
}

export function upstreamUnavailableJson(detail?: string) {
  return NextResponse.json(
    {
      error: 'Upstream unavailable',
      detail: detail || undefined,
      hint: `Set ${paths.envPersonaBackendInternal} / ${paths.envChatApiInternal} or use fixtures`,
    },
    { status: 502 },
  )
}
