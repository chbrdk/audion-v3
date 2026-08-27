/**
 * Knowledge file extract — .docx / .pdf / .pptx / .md → plain + HTML.
 * Spec: specs/domain/chat-knowledge-rag.md
 */

import JSZip from 'jszip'
import { PDFParse } from 'pdf-parse'
import { extractDocxText } from '../chat/extract-docx'
import { paths } from '../paths'
import {
  newKnowledgeChapterId,
  sanitizeKnowledgeHtml,
  toKnowledgeHtml,
} from '../project-knowledge'
import {
  KNOWLEDGE_UPLOAD_ACCEPT,
  KNOWLEDGE_UPLOAD_EXTENSIONS,
  type KnowledgeUploadExt,
} from './upload-formats'

export {
  KNOWLEDGE_UPLOAD_ACCEPT,
  KNOWLEDGE_UPLOAD_EXTENSIONS,
  type KnowledgeUploadExt,
} from './upload-formats'

export type KnowledgeFileExtract =
  | {
      ok: true
      title: string
      html: string
      text: string
      truncated: boolean
      format: KnowledgeUploadExt
    }
  | { ok: false; error: string; status: number }

const TRUNCATION_MARKER = '\n\n[… truncated]'

function extensionOf(filename: string): KnowledgeUploadExt | null {
  const lower = filename.trim().toLowerCase()
  for (const ext of KNOWLEDGE_UPLOAD_EXTENSIONS) {
    if (lower.endsWith(ext)) return ext
  }
  return null
}

function titleFromFilename(filename: string, ext: KnowledgeUploadExt): string {
  const base = filename.replace(new RegExp(`${ext.replace('.', '\\.')}$`, 'i'), '').trim()
  return base || 'Document'
}

function applyCharCap(text: string, maxChars: number): { text: string; truncated: boolean } {
  const trimmed = text.replace(/\r\n/g, '\n').trim()
  if (trimmed.length <= maxChars) return { text: trimmed, truncated: false }
  const keep = Math.max(0, maxChars - TRUNCATION_MARKER.length)
  return { text: `${trimmed.slice(0, keep)}${TRUNCATION_MARKER}`, truncated: true }
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer })
  try {
    const result = await parser.getText()
    return (result?.text || '').replace(/\r\n/g, '\n').trim()
  } finally {
    await parser.destroy().catch(() => undefined)
  }
}

async function extractPptxText(buffer: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer)
  const slideNames = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name))
    .sort((a, b) => {
      const na = Number(/slide(\d+)/i.exec(a)?.[1] || 0)
      const nb = Number(/slide(\d+)/i.exec(b)?.[1] || 0)
      return na - nb
    })
  const parts: string[] = []
  for (const name of slideNames) {
    const xml = await zip.file(name)?.async('string')
    if (!xml) continue
    const texts = [...xml.matchAll(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g)].map((m) =>
      m[1]!.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim(),
    )
    const slide = texts.filter(Boolean).join(' ')
    if (slide) parts.push(slide)
  }
  return parts.join('\n\n').trim()
}

function extractMarkdownText(buffer: Buffer): string {
  let raw = buffer.toString('utf8').replace(/\r\n/g, '\n')
  if (raw.startsWith('---')) {
    const end = raw.indexOf('\n---', 3)
    if (end >= 0) raw = raw.slice(end + 4)
  }
  return raw
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '• ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/`{1,3}([^`]+)`{1,3}/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .trim()
}

/** Extract supported knowledge upload formats into dossier HTML. */
export async function extractFileForKnowledge(file: File): Promise<KnowledgeFileExtract> {
  const filename = (file.name || 'document').trim()
  const format = extensionOf(filename)
  if (!format) {
    return {
      ok: false,
      error: 'Supported formats: .docx, .pdf, .pptx, .md',
      status: 415,
    }
  }
  if (file.size > paths.chatDocumentUploadMaxBytes) {
    return { ok: false, error: 'Document exceeds max upload size', status: 413 }
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    let raw = ''
    if (format === '.docx') {
      const docx = await extractDocxText(buffer, paths.chatDocumentUploadMaxChars)
      raw = docx.text
      if (!raw.trim()) {
        return { ok: false, error: 'Document has no extractable text', status: 422 }
      }
      const capped = applyCharCap(raw, paths.chatDocumentUploadMaxChars)
      const html = sanitizeKnowledgeHtml(toKnowledgeHtml(capped.text))
      return {
        ok: true,
        title: titleFromFilename(filename, format),
        html,
        text: capped.text,
        truncated: docx.truncated || capped.truncated,
        format,
      }
    }
    if (format === '.pdf') raw = await extractPdfText(buffer)
    else if (format === '.pptx') raw = await extractPptxText(buffer)
    else raw = extractMarkdownText(buffer)

    const capped = applyCharCap(raw, paths.chatDocumentUploadMaxChars)
    if (!capped.text.trim()) {
      return { ok: false, error: 'Document has no extractable text', status: 422 }
    }
    const html = sanitizeKnowledgeHtml(toKnowledgeHtml(capped.text))
    return {
      ok: true,
      title: titleFromFilename(filename, format),
      html,
      text: capped.text,
      truncated: capped.truncated,
      format,
    }
  } catch {
    return { ok: false, error: `Failed to extract ${format} text`, status: 422 }
  }
}

/** @deprecated Prefer extractFileForKnowledge */
export async function extractDocxForKnowledge(file: File): Promise<KnowledgeFileExtract> {
  return extractFileForKnowledge(file)
}

export type DocxKnowledgeExtract = KnowledgeFileExtract

export function newDocxChapterId(): string {
  return `ch-file-${newKnowledgeChapterId()}`
}
