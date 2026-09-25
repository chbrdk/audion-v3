/**
 * Client-safe chat document extension helpers (no mammoth/pdf-parse/xlsx).
 * Spec: specs/domain/chat-document-attachments.md
 */

import { paths } from '../paths'

export type ChatDocumentExt = (typeof paths.chatDocumentExtensions)[number]

export const CHAT_DOCUMENT_UPLOAD_ACCEPT = paths.chatDocumentUploadAccept

export function extensionOfChatDocument(filename: string): ChatDocumentExt | null {
  const lower = filename.trim().toLowerCase()
  for (const ext of paths.chatDocumentExtensions) {
    if (lower.endsWith(ext)) return ext
  }
  return null
}

export function isChatDocumentFilename(filename: string): boolean {
  return extensionOfChatDocument(filename) != null
}
