/**
 * Chat DOCX upload store (persona attachments).
 * Postgres when DATABASE_URL set; else in-memory map.
 * Spec: specs/domain/chat-document-attachments.md
 */

import { randomUUID } from 'node:crypto'
import {
  dbGetChatDocument,
  dbPutChatDocument,
} from '../db/chat-attachments'
import { isProjectsDatabaseConfigured } from '../db/config'
import { paths } from '../paths'
import { extractDocxText } from './extract-docx'

export type StoredChatDocument = {
  filename: string
  extractedText: string
  charCount: number
  truncated: boolean
  createdAtMs: number
  expiresAtMs: number
}

const store = new Map<string, StoredChatDocument>()

function ttlMs(): number {
  return paths.chatDocumentUploadTtlSeconds * 1000
}

function purgeExpired(now = Date.now()): void {
  for (const [id, entry] of store) {
    if (entry.expiresAtMs <= now) store.delete(id)
  }
}

export function resetChatDocumentUploadStore(): void {
  store.clear()
}

function isDocxFilename(name: string): boolean {
  return name.trim().toLowerCase().endsWith('.docx')
}

export type PutChatDocumentResult =
  | {
      ok: true
      documentId: string
      filename: string
      charCount: number
      truncated: boolean
    }
  | { ok: false; error: string; status: number }

export async function putChatDocument(input: {
  filename: string
  buffer: Buffer
}): Promise<PutChatDocumentResult> {
  purgeExpired()
  const filename = input.filename.trim() || 'document.docx'
  if (!isDocxFilename(filename)) {
    return { ok: false, error: 'Only .docx files are supported', status: 415 }
  }
  if (input.buffer.byteLength > paths.chatDocumentUploadMaxBytes) {
    return { ok: false, error: 'Document exceeds max upload size', status: 413 }
  }

  let extracted: { text: string; truncated: boolean }
  try {
    extracted = await extractDocxText(input.buffer, paths.chatDocumentUploadMaxChars)
  } catch {
    return { ok: false, error: 'Failed to extract DOCX text', status: 422 }
  }

  const documentId = randomUUID()
  const now = Date.now()
  const expiresAtMs = now + ttlMs()
  const charCount = extracted.text.length
  const row: StoredChatDocument = {
    filename,
    extractedText: extracted.text,
    charCount,
    truncated: extracted.truncated,
    createdAtMs: now,
    expiresAtMs,
  }

  if (isProjectsDatabaseConfigured()) {
    await dbPutChatDocument({
      id: documentId,
      filename: row.filename,
      extractedText: row.extractedText,
      charCount: row.charCount,
      truncated: row.truncated,
      expiresAt: new Date(expiresAtMs),
    })
  } else {
    store.set(documentId, row)
  }

  return {
    ok: true,
    documentId,
    filename: row.filename,
    charCount: row.charCount,
    truncated: row.truncated,
  }
}

export async function getChatDocument(
  documentId: string,
): Promise<StoredChatDocument | null> {
  if (isProjectsDatabaseConfigured()) {
    const row = await dbGetChatDocument(documentId)
    if (!row) return null
    const now = Date.now()
    return {
      filename: row.filename,
      extractedText: row.extractedText,
      charCount: row.charCount,
      truncated: row.truncated,
      createdAtMs: now,
      expiresAtMs: now + ttlMs(),
    }
  }
  purgeExpired()
  return store.get(documentId) ?? null
}

export type ResolveChatDocumentsResult =
  | {
      ok: true
      documents: Array<{
        id: string
        filename: string
        extractedText: string
        charCount: number
      }>
    }
  | { ok: false; error: string }

/** Resolve upload IDs in order; fails if any id is missing/expired. */
export async function resolveChatDocuments(
  documentIds: string[],
): Promise<ResolveChatDocumentsResult> {
  const documents: Array<{
    id: string
    filename: string
    extractedText: string
    charCount: number
  }> = []
  for (const id of documentIds) {
    const entry = await getChatDocument(id)
    if (!entry) {
      return { ok: false, error: `Document not found or expired: ${id}` }
    }
    documents.push({
      id,
      filename: entry.filename,
      extractedText: entry.extractedText,
      charCount: entry.charCount,
    })
  }
  return { ok: true, documents }
}
