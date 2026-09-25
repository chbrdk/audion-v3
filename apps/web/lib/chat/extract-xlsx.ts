/**
 * XLSX / XLS → TSV text per sheet (SheetJS), with hard caps.
 * Spec: specs/domain/chat-document-attachments.md
 */

import * as XLSX from 'xlsx'
import { paths } from '../paths'

const TRUNCATION_MARKER = '\n\n[… truncated]'

function applyCharCap(text: string, maxChars: number): { text: string; truncated: boolean } {
  const trimmed = text.replace(/\r\n/g, '\n').trim()
  if (trimmed.length <= maxChars) return { text: trimmed, truncated: false }
  const keep = Math.max(0, maxChars - TRUNCATION_MARKER.length)
  return { text: `${trimmed.slice(0, keep)}${TRUNCATION_MARKER}`, truncated: true }
}

function cellToString(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'string') return value.replace(/\t|\r?\n/g, ' ').trim()
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (value instanceof Date) return value.toISOString()
  return String(value).replace(/\t|\r?\n/g, ' ').trim()
}

export function extractXlsxText(
  buffer: Buffer,
  maxChars: number,
): { text: string; truncated: boolean } {
  if (!buffer.byteLength) {
    return { text: '', truncated: false }
  }
  const workbook = XLSX.read(buffer, {
    type: 'buffer',
    cellDates: true,
    dense: true,
  })
  const sheetNames = (workbook.SheetNames || []).slice(0, paths.chatDocumentXlsxMaxSheets)
  const parts: string[] = []
  const maxRows = paths.chatDocumentXlsxMaxRowsPerSheet
  const maxCols = paths.chatDocumentXlsxMaxCols

  for (const name of sheetNames) {
    const sheet = workbook.Sheets[name]
    if (!sheet) continue
    const rows = XLSX.utils.sheet_to_json<(string | number | boolean | Date | null)[]>(sheet, {
      header: 1,
      defval: '',
      raw: false,
      blankrows: false,
    }) as unknown[][]
    if (!rows.length) continue
    const limited = rows.slice(0, maxRows).map((row) => {
      const cells = Array.isArray(row) ? row : []
      return cells
        .slice(0, maxCols)
        .map((c) => cellToString(c))
        .join('\t')
        .replace(/\t+$/, '')
    })
    const body = limited.filter((line) => line.trim().length > 0).join('\n')
    if (!body) continue
    parts.push(`### Sheet: ${name}\n\n${body}`)
  }

  return applyCharCap(parts.join('\n\n'), maxChars)
}
