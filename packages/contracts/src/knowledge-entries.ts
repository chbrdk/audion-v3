/** Shared knowledge / document entries for TG + persona magazine (V2 RAG siblings). */

export type KnowledgeEntry = {
  id: string
  title: string
  content: string
  updatedAt: string | null
}

export type KnowledgeEntryWrite = {
  title: string
  content: string
}

export type DocumentSource = {
  id: string
  name: string
  status: 'pending' | 'ready' | 'failed'
  mimeType: string | null
  updatedAt: string | null
}
