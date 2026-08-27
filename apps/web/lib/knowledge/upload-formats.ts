/** Client-safe knowledge upload format constants (no Node extractors). */

export const KNOWLEDGE_UPLOAD_EXTENSIONS = ['.docx', '.pdf', '.pptx', '.md'] as const

export type KnowledgeUploadExt = (typeof KNOWLEDGE_UPLOAD_EXTENSIONS)[number]

export const KNOWLEDGE_UPLOAD_ACCEPT =
  '.docx,.pdf,.pptx,.md,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/markdown,text/plain'

export function isKnowledgeUploadFilename(filename: string): boolean {
  const lower = filename.trim().toLowerCase()
  return KNOWLEDGE_UPLOAD_EXTENSIONS.some((ext) => lower.endsWith(ext))
}
