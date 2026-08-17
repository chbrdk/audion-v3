import { paths } from '../paths'
import { getTavusApiBase, getTavusApiKey } from '../runtime-config'
import { TavusApiError } from './client'
import { trimTavusId } from './ids'
import { buildTavusPalSystemPrompt, tavusPalName, type TavusPalPromptSource } from './prompt'

export type TavusPalUpsertPayload = {
  pal_name: string
  system_prompt: string
  pipeline_mode: typeof paths.tavusPalPipelineMode
  default_face_id: string
}

function requireApiKey(): string {
  const apiKey = getTavusApiKey()
  if (!apiKey) {
    throw new TavusApiError('Tavus is not configured (TAVUS_API_KEY)', 503)
  }
  return apiKey
}

function tavusHeaders(apiKey: string, json = false): HeadersInit {
  return {
    ...(json ? { 'Content-Type': 'application/json' } : {}),
    'x-api-key': apiKey,
  }
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  const text = await response.text()
  try {
    return text ? (JSON.parse(text) as Record<string, unknown>) : {}
  } catch {
    return { raw: text }
  }
}

function detailOf(json: Record<string, unknown>, fallback: string): string {
  if (typeof json.message === 'string') return json.message
  if (typeof json.error === 'string') return json.error
  return fallback.slice(0, 240)
}

function throwIfFailed(response: Response, json: Record<string, unknown>, fallback: string): void {
  if (response.ok || response.status === 304) return
  const detail = detailOf(json, fallback)
  throw new TavusApiError(
    detail ? `${fallback} (${response.status}): ${detail.slice(0, 280)}` : `${fallback} (${response.status})`,
    response.status,
    detail,
  )
}

export function tavusPalsUrl(base = getTavusApiBase()): string {
  return `${base.replace(/\/$/, '')}${paths.tavusPalsPath}`
}

export function tavusPalUrl(palId: string, base = getTavusApiBase()): string {
  return `${tavusPalsUrl(base)}/${encodeURIComponent(palId.trim())}`
}

export function tavusPalLivePatchUrl(palId: string, base = getTavusApiBase()): string {
  const params = new URLSearchParams({ target: paths.tavusPalPatchTarget })
  return `${tavusPalUrl(palId, base)}?${params.toString()}`
}

export function buildTavusPalUpsertPayload(
  persona: TavusPalPromptSource & { tavusReplicaId?: string | null },
): TavusPalUpsertPayload | null {
  const replicaId = trimTavusId(persona.tavusReplicaId)
  if (!replicaId) return null
  return {
    pal_name: tavusPalName(persona.name),
    system_prompt: buildTavusPalSystemPrompt(persona),
    pipeline_mode: paths.tavusPalPipelineMode,
    default_face_id: replicaId,
  }
}

function readPalId(json: Record<string, unknown>): string | null {
  return trimTavusId(json.pal_id) || trimTavusId(json.persona_id) || trimTavusId(json.live_pal_id)
}

export async function createTavusPal(payload: TavusPalUpsertPayload): Promise<string> {
  const apiKey = requireApiKey()
  const response = await fetch(tavusPalsUrl(), {
    method: 'POST',
    headers: tavusHeaders(apiKey, true),
    body: JSON.stringify(payload),
    cache: 'no-store',
  })
  const json = await readJson(response)
  throwIfFailed(response, json, 'Tavus PAL create failed')
  const palId = readPalId(json)
  if (!palId) throw new TavusApiError('Tavus returned no pal_id', 502)
  return palId
}

export function buildTavusPalPatchOps(payload: TavusPalUpsertPayload): Array<{
  op: 'replace'
  path: string
  value: string
}> {
  return [
    { op: 'replace', path: '/system_prompt', value: payload.system_prompt },
    { op: 'replace', path: '/pal_name', value: payload.pal_name },
    { op: 'replace', path: '/default_face_id', value: payload.default_face_id },
  ]
}

export async function patchTavusPal(palId: string, payload: TavusPalUpsertPayload): Promise<string> {
  const apiKey = requireApiKey()
  const id = palId.trim()
  const response = await fetch(tavusPalLivePatchUrl(id), {
    method: 'PATCH',
    headers: tavusHeaders(apiKey, true),
    body: JSON.stringify(buildTavusPalPatchOps(payload)),
    cache: 'no-store',
  })
  const json = await readJson(response)
  throwIfFailed(response, json, 'Tavus PAL patch failed')
  return readPalId(json) || id
}

export async function upsertTavusPal(
  persona: TavusPalPromptSource & { tavusReplicaId?: string | null; tavusPersonaId?: string | null },
): Promise<{ palId: string; created: boolean } | { palId: null; skipped: true; reason: string }> {
  const payload = buildTavusPalUpsertPayload(persona)
  if (!payload) return { palId: null, skipped: true, reason: 'no_replica' }
  if (!getTavusApiKey()) return { palId: null, skipped: true, reason: 'no_key' }

  const existing = trimTavusId(persona.tavusPersonaId)
  if (existing) {
    try {
      const palId = await patchTavusPal(existing, payload)
      return { palId, created: false }
    } catch (error) {
      if (!(error instanceof TavusApiError) || error.status !== 404) throw error
    }
  }
  const palId = await createTavusPal(payload)
  return { palId, created: true }
}
