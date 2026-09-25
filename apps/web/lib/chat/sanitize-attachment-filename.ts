/**
 * Sanitize chat attachment filenames for store + UI + merge headers.
 * Spec: specs/domain/chat-document-attachments.md
 */

import { paths } from '../paths'

/** Strip paths, control chars, and collapse whitespace; keep a safe basename. */
export function sanitizeChatAttachmentFilename(
  raw: string,
  fallback = 'document',
): string {
  let name =
    String(raw ?? '')
      .replace(/\\/g, '/')
      .split('/')
      .pop()
      ?.trim() ?? ''
  name = name
    .replace(/[\t\n\r\f\v]+/g, ' ')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  name = name.replace(/^\.+/, '').trim()
  if (!name || name === '.' || name === '..') name = fallback
  const max = paths.chatDocumentFilenameMaxChars
  if (name.length > max) {
    const extMatch = /\.[A-Za-z0-9]{1,12}$/.exec(name)
    const ext = extMatch?.[0] ?? ''
    const stem = name.slice(0, Math.max(1, max - ext.length))
    name = `${stem}${ext}`
  }
  return name
}
