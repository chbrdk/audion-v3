/**
 * Knowledge RAG durable store (Postgres jsonb embeddings + app cosine).
 * Spec: specs/domain/chat-knowledge-rag.md
 *
 * Staging Coolify DB is postgres:alpine (no pgvector). Phase 1 stores
 * embeddings as jsonb and scores in-process; swap to vector type later.
 */

import { randomUUID } from 'node:crypto'
import { sql } from 'drizzle-orm'
import type {
  KnowledgeRagDocumentStatus,
  KnowledgeRagDocumentSummary,
  KnowledgeRagIngestPayload,
  KnowledgeRagIngestResult,
  KnowledgeRagSource,
  KnowledgeRagSourceType,
} from '@audion-v3/contracts'
import { getDb, isProjectsDatabaseConfigured } from '../../db/client'
import { paths } from '../../paths'
import {
  chunkPlainText,
  estimateTokens,
  stripHtmlToPlain,
} from './chunker'
import {
  cosineSimilarity,
  embedQuery,
  embedTexts,
  getKnowledgeRagEmbeddingModel,
  hasKnowledgeRagEmbedCredentials,
  isKnowledgeRagEnabled,
} from './embed'

let ensured = false
let schemaOk: boolean | null = null

export async function ensureKnowledgeRagSchema(): Promise<boolean> {
  if (!isProjectsDatabaseConfigured()) {
    schemaOk = false
    return false
  }
  if (ensured && schemaOk != null) return schemaOk
  try {
    const db = getDb()
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS knowledge_documents (
        id text PRIMARY KEY,
        project_id text NOT NULL,
        source_type text NOT NULL,
        source_ref text,
        title text NOT NULL,
        status text NOT NULL,
        error text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `)
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS knowledge_chunks (
        id text PRIMARY KEY,
        document_id text NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
        project_id text NOT NULL,
        ord integer NOT NULL,
        content text NOT NULL,
        token_estimate integer NOT NULL DEFAULT 0,
        embedding jsonb NOT NULL,
        model_id text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `)
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS knowledge_chunks_project_model_idx
      ON knowledge_chunks (project_id, model_id)
    `)
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS knowledge_documents_project_idx
      ON knowledge_documents (project_id)
    `)
    ensured = true
    schemaOk = true
    return true
  } catch {
    schemaOk = false
    return false
  }
}

function parseEmbedding(raw: unknown): number[] | null {
  if (Array.isArray(raw) && raw.every((n) => typeof n === 'number')) {
    return raw as number[]
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown
      if (Array.isArray(parsed) && parsed.every((n) => typeof n === 'number')) {
        return parsed as number[]
      }
    } catch {
      return null
    }
  }
  return null
}

export async function ingestKnowledgeText(
  payload: KnowledgeRagIngestPayload,
): Promise<KnowledgeRagIngestResult> {
  if (!isKnowledgeRagEnabled()) {
    return {
      documentId: '',
      status: 'failed',
      chunkCount: 0,
      error: 'RAG disabled',
    }
  }
  if (!isProjectsDatabaseConfigured()) {
    return {
      documentId: '',
      status: 'failed',
      chunkCount: 0,
      error: 'DATABASE_URL required for knowledge RAG',
    }
  }
  if (!(await ensureKnowledgeRagSchema())) {
    return {
      documentId: '',
      status: 'failed',
      chunkCount: 0,
      error: 'Knowledge RAG schema unavailable',
    }
  }
  if (!hasKnowledgeRagEmbedCredentials()) {
    return {
      documentId: '',
      status: 'failed',
      chunkCount: 0,
      error: 'Embedding credentials missing',
    }
  }

  const projectId = payload.projectId.trim()
  const title = payload.title.trim() || 'Untitled'
  const plain = stripHtmlToPlain(payload.text || '')
  if (!projectId) {
    return { documentId: '', status: 'failed', chunkCount: 0, error: 'projectId required' }
  }
  if (!plain) {
    return { documentId: '', status: 'failed', chunkCount: 0, error: 'text is empty' }
  }

  const chunks = chunkPlainText(plain, {
    chunkChars: paths.knowledgeRagChunkChars,
    overlapChars: paths.knowledgeRagChunkOverlap,
    maxChunks: paths.knowledgeRagMaxChunksPerDoc,
  })
  if (!chunks.length) {
    return { documentId: '', status: 'failed', chunkCount: 0, error: 'No chunks produced' }
  }

  const documentId = payload.replaceDocumentId?.trim() || randomUUID()
  const modelId = getKnowledgeRagEmbeddingModel()
  const db = getDb()

  try {
    if (payload.replaceDocumentId?.trim()) {
      await db.execute(sql`
        DELETE FROM knowledge_chunks WHERE document_id = ${documentId}
      `)
      await db.execute(sql`
        DELETE FROM knowledge_documents WHERE id = ${documentId}
      `)
    }

    await db.execute(sql`
      INSERT INTO knowledge_documents (
        id, project_id, source_type, source_ref, title, status, error, updated_at
      ) VALUES (
        ${documentId},
        ${projectId},
        ${payload.sourceType},
        ${payload.sourceRef?.trim() || null},
        ${title},
        ${'pending'},
        ${null},
        now()
      )
      ON CONFLICT (id) DO UPDATE SET
        project_id = EXCLUDED.project_id,
        source_type = EXCLUDED.source_type,
        source_ref = EXCLUDED.source_ref,
        title = EXCLUDED.title,
        status = ${'pending'},
        error = NULL,
        updated_at = now()
    `)

    const vectors = await embedTexts(chunks)
    for (let i = 0; i < chunks.length; i++) {
      const chunkId = randomUUID()
      const content = chunks[i]!
      const embedding = JSON.stringify(vectors[i])
      await db.execute(sql`
        INSERT INTO knowledge_chunks (
          id, document_id, project_id, ord, content, token_estimate, embedding, model_id
        ) VALUES (
          ${chunkId},
          ${documentId},
          ${projectId},
          ${i},
          ${content},
          ${estimateTokens(content)},
          ${embedding}::jsonb,
          ${modelId}
        )
      `)
    }

    await db.execute(sql`
      UPDATE knowledge_documents
      SET status = ${'ready'}, error = NULL, updated_at = now()
      WHERE id = ${documentId}
    `)

    return { documentId, status: 'ready', chunkCount: chunks.length }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    await db.execute(sql`
      UPDATE knowledge_documents
      SET status = ${'failed'}, error = ${message.slice(0, 500)}, updated_at = now()
      WHERE id = ${documentId}
    `).catch(() => undefined)
    return {
      documentId,
      status: 'failed',
      chunkCount: 0,
      error: message,
    }
  }
}

export async function retrieveKnowledgeSources(input: {
  projectId: string
  query: string
  topK?: number
}): Promise<{ sources: KnowledgeRagSource[]; modelId: string }> {
  const modelId = getKnowledgeRagEmbeddingModel()
  const empty = { sources: [] as KnowledgeRagSource[], modelId }

  if (!isKnowledgeRagEnabled()) return empty
  const projectId = input.projectId.trim()
  const query = input.query.trim()
  if (!projectId || !query) return empty
  if (!isProjectsDatabaseConfigured()) return empty
  if (!(await ensureKnowledgeRagSchema())) return empty
  if (!hasKnowledgeRagEmbedCredentials()) return empty

  const queryVec = await embedQuery(query)
  if (!queryVec) return empty

  try {
    const db = getDb()
    const result = await db.execute(sql`
      SELECT
        c.id,
        c.document_id,
        c.ord,
        c.content,
        c.embedding,
        d.title
      FROM knowledge_chunks c
      JOIN knowledge_documents d ON d.id = c.document_id
      WHERE c.project_id = ${projectId}
        AND c.model_id = ${modelId}
        AND d.status = ${'ready'}
    `)

    const scored: KnowledgeRagSource[] = []
    for (const row of result.rows as Array<Record<string, unknown>>) {
      const embedding = parseEmbedding(row.embedding)
      if (!embedding) continue
      const score = cosineSimilarity(queryVec, embedding)
      if (score < paths.knowledgeRagMinScore) continue
      scored.push({
        id: String(row.id),
        documentId: String(row.document_id),
        title: String(row.title || 'Source'),
        content: String(row.content || ''),
        score,
        ord: Number(row.ord ?? 0),
      })
    }

    scored.sort((a, b) => b.score - a.score)
    const topK = Math.max(1, input.topK ?? paths.knowledgeRagTopK)
    return { sources: scored.slice(0, topK), modelId }
  } catch {
    return empty
  }
}

export async function listKnowledgeRagDocuments(
  projectId: string,
): Promise<KnowledgeRagDocumentSummary[]> {
  if (!projectId.trim() || !isProjectsDatabaseConfigured()) return []
  if (!(await ensureKnowledgeRagSchema())) return []
  const db = getDb()
  const result = await db.execute(sql`
    SELECT
      d.id,
      d.project_id,
      d.source_type,
      d.source_ref,
      d.title,
      d.status,
      d.error,
      d.updated_at,
      (
        SELECT count(*)::int FROM knowledge_chunks c WHERE c.document_id = d.id
      ) AS chunk_count
    FROM knowledge_documents d
    WHERE d.project_id = ${projectId.trim()}
    ORDER BY d.updated_at DESC
  `)
  return (result.rows as Array<Record<string, unknown>>).map((row) => ({
    id: String(row.id),
    projectId: String(row.project_id),
    sourceType: row.source_type as KnowledgeRagSourceType,
    sourceRef: row.source_ref == null ? null : String(row.source_ref),
    title: String(row.title || ''),
    status: row.status as KnowledgeRagDocumentStatus,
    error: row.error == null ? null : String(row.error),
    chunkCount: Number(row.chunk_count ?? 0),
    updatedAt: row.updated_at ? new Date(String(row.updated_at)).toISOString() : null,
  }))
}

export async function deleteKnowledgeRagDocument(id: string): Promise<boolean> {
  if (!id.trim() || !isProjectsDatabaseConfigured()) return false
  if (!(await ensureKnowledgeRagSchema())) return false
  const db = getDb()
  await db.execute(sql`DELETE FROM knowledge_documents WHERE id = ${id.trim()}`)
  return true
}
