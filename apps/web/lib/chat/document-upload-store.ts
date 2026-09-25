/**
 * Chat document upload store (persona attachments).
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
import {
  extensionOfChatDocument,
  type ChatDocumentExt,
} from './document-formats'
import { extractDocxText } from './extract-docx'
import { extractPdfText } from './extract-pdf'
import { extractMarkdownText, extractPlainText } from './extract-plain'
import { extractPptxText } from './extract-pptx'
import { extractXlsxText } from './extract-xlsx'
import { sanitizeChatAttachmentFilename } from './sanitize-attachment-filename'

export type { ChatDocumentExt } from './document-formats'
export {
  extensionOfChatDocument,
  isChatDocumentFilename,
  CHAT_DOCUMENT_UPLOAD_ACCEPT,
} from './document-formats'

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

async function extractByExt(
  ext: ChatDocumentExt,
  buffer: Buffer,
): Promise<{ text: string; truncated: boolean }> {
  const max = paths.chatDocumentUploadMaxChars
  switch (ext) {
    case '.docx':
      return extractDocxText(buffer, max)
    case '.pdf':
      return extractPdfText(buffer, max)
    case '.pptx':
      return extractPptxText(buffer, max)
    case '.md':
    case '.markdown':
      return extractMarkdownText(buffer, max)
    case '.txt':
      return extractPlainText(buffer, max)
    case '.xlsx':
    case '.xls':
      return extractXlsxText(buffer, max)
    default: {
      const _exhaustive: never = ext
      return _exhaustive
    }
  }
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
  if (!input.buffer?.byteLength) {
    return { ok: false, error: 'Empty file', status: 400 }
  }
  const filename = sanitizeChatAttachmentFilename(
    input.filename.trim() || 'document.docx',
    'document.docx',
  )
  const ext = extensionOfChatDocument(filename)
  if (!ext) {
    return {
      ok: false,
      error:
        'Only .docx, .pdf, .pptx, .md, .markdown, .txt, .xlsx, .xls files are supported',
      status: 415,
    }
  }
  if (input.buffer.byteLength > paths.chatDocumentUploadMaxBytes) {
    return { ok: false, error: 'Document exceeds max upload size', status: 413 }
  }

  let extracted: { text: string; truncated: boolean }
  try {
    extracted = await extractByExt(ext, input.buffer)
  } catch (err) {
    const msg = err instanceof Error ? err.message.toLowerCase() : ''
    if (msg.includes('password') || msg.includes('encrypted')) {
      return {
        ok: false,
        error: 'Failed to extract PDF text (password-protected)',
        status: 422,
      }
    }
    return { ok: false, error: `Failed to extract ${ext} text`, status: 422 }
  }

  if (!extracted.text.trim()) {
    return { ok: false, error: 'Document has no extractable text', status: 422 }
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

/** Resolve upload IDs in order; fails if any id is missing/expired. Caps per turn. */
export async function resolveChatDocuments(
  documentIds: string[],
): Promise<ResolveChatDocumentsResult> {
  const ids = documentIds.slice(0, paths.chatDocumentMaxPerTurn)
  const documents: Array<{
    id: string
    filename: string
    extractedText: string
    charCount: number
  }> = []
  for (const id of ids) {
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
