/**
 * DOCX → knowledge dossier HTML (server).
 * Used by project / persona / TG knowledge upload routes.
 */

import { extractDocxText } from '../chat/extract-docx'
import { paths } from '../paths'
import {
  newKnowledgeChapterId,
  sanitizeKnowledgeHtml,
  toKnowledgeHtml,
} from '../project-knowledge'

export type DocxKnowledgeExtract =
  | { ok: true; title: string; html: string; text: string; truncated: boolean }
  | { ok: false; error: string; status: number }

export async function extractDocxForKnowledge(file: File): Promise<DocxKnowledgeExtract> {
  const filename = (file.name || 'document.docx').trim()
  if (!filename.toLowerCase().endsWith('.docx')) {
    return { ok: false, error: 'Only .docx files are supported', status: 415 }
  }
  if (file.size > paths.chatDocumentUploadMaxBytes) {
    return { ok: false, error: 'Document exceeds max upload size', status: 413 }
  }
  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    const extracted = await extractDocxText(buffer, paths.chatDocumentUploadMaxChars)
    if (!extracted.text.trim()) {
      return { ok: false, error: 'Document has no extractable text', status: 422 }
    }
    const title = filename.replace(/\.docx$/i, '').trim() || 'Document'
    const html = sanitizeKnowledgeHtml(toKnowledgeHtml(extracted.text))
    return {
      ok: true,
      title,
      html,
      text: extracted.text,
      truncated: extracted.truncated,
    }
  } catch {
    return { ok: false, error: 'Failed to extract DOCX text', status: 422 }
  }
}

export function newDocxChapterId(): string {
  return `ch-docx-${newKnowledgeChapterId()}`
}
