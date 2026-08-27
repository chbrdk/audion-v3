/**
 * Embedding client — OpenRouter preferred, OpenAI key fallback.
 * Spec: specs/domain/chat-knowledge-rag.md
 */

import { paths } from '../../paths'

export function isKnowledgeRagEnabled(): boolean {
  const raw = process.env[paths.envKnowledgeRagEnabled]?.trim()
  if (raw === '0' || raw === 'false') return false
  return true
}

export function getKnowledgeRagEmbeddingModel(): string {
  return (
    process.env[paths.envKnowledgeRagEmbeddingModel]?.trim() ||
    paths.knowledgeRagEmbeddingModel
  )
}

function getOpenRouterKey(): string {
  return process.env[paths.envOpenRouterApiKey]?.trim() || ''
}

function getOpenRouterBase(): string {
  return (
    process.env[paths.envOpenRouterApiBaseUrl]?.trim() ||
    paths.openRouterApiDefaultBase
  ).replace(/\/$/, '')
}

type EmbedProvider = {
  apiKey: string
  baseUrl: string
  model: string
  via: 'openrouter' | 'openai'
}

function resolveEmbedProvider(): EmbedProvider | null {
  const model = getKnowledgeRagEmbeddingModel()
  const orKey = getOpenRouterKey()
  if (orKey) {
    return {
      apiKey: orKey,
      baseUrl: getOpenRouterBase(),
      model,
      via: 'openrouter',
    }
  }
  const oaKey = process.env[paths.envOpenAiApiKey]?.trim() || ''
  if (!oaKey) return null
  const base =
    process.env[paths.envOpenAiApiBaseUrl]?.trim() || 'https://api.openai.com/v1'
  // Native OpenAI model ids omit the `openai/` provider prefix.
  const nativeModel = model.startsWith('openai/') ? model.slice('openai/'.length) : model
  return {
    apiKey: oaKey,
    baseUrl: base.replace(/\/$/, ''),
    model: nativeModel,
    via: 'openai',
  }
}

export function hasKnowledgeRagEmbedCredentials(): boolean {
  return Boolean(resolveEmbedProvider())
}

function assertDims(vec: number[]): void {
  if (vec.length !== paths.knowledgeRagEmbeddingDims) {
    throw new Error(
      `Embedding dim ${vec.length} !== expected ${paths.knowledgeRagEmbeddingDims}`,
    )
  }
}

/** Embed one or more texts; returns vectors in input order. */
export async function embedTexts(inputs: string[]): Promise<number[][]> {
  if (!inputs.length) return []
  const provider = resolveEmbedProvider()
  if (!provider) {
    throw new Error('No embedding credentials (OPENROUTER_API_KEY or OPENAI_API_KEY)')
  }

  const batchSize = paths.knowledgeRagEmbedBatchSize
  const out: number[][] = []
  for (let i = 0; i < inputs.length; i += batchSize) {
    const batch = inputs.slice(i, i + batchSize)
    const headers: Record<string, string> = {
      Authorization: `Bearer ${provider.apiKey}`,
      'Content-Type': 'application/json',
    }
    if (provider.via === 'openrouter') {
      headers['HTTP-Referer'] = paths.audionV3StagingOrigin
      headers['X-Title'] = paths.brandLabel
    }
    const res = await fetch(`${provider.baseUrl}/embeddings`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: provider.model,
        input: batch.length === 1 ? batch[0] : batch,
      }),
    })
    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      throw new Error(`Embeddings failed (${res.status}): ${detail.slice(0, 200)}`)
    }
    const body = (await res.json()) as {
      data?: Array<{ embedding?: number[]; index?: number }>
    }
    const rows = [...(body.data ?? [])].sort(
      (a, b) => (a.index ?? 0) - (b.index ?? 0),
    )
    if (rows.length !== batch.length) {
      throw new Error(`Embeddings count mismatch: got ${rows.length}, expected ${batch.length}`)
    }
    for (const row of rows) {
      const vec = row.embedding
      if (!Array.isArray(vec) || !vec.length) throw new Error('Empty embedding vector')
      assertDims(vec)
      out.push(vec)
    }
  }
  return out
}

export async function embedQuery(text: string): Promise<number[] | null> {
  const trimmed = text.trim()
  if (!trimmed) return null
  try {
    const [vec] = await embedTexts([trimmed])
    return vec ?? null
  } catch {
    return null
  }
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || !a.length) return 0
  let dot = 0
  let na = 0
  let nb = 0
  for (let i = 0; i < a.length; i++) {
    const x = a[i]!
    const y = b[i]!
    dot += x * y
    na += x * x
    nb += y * y
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb)
  return denom === 0 ? 0 : dot / denom
}
