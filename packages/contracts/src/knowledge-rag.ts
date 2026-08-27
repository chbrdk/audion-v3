/** Project knowledge RAG contracts — specs/domain/chat-knowledge-rag.md */

export type KnowledgeRagSourceType = 'docx' | 'chapter' | 'research' | 'entry'

export type KnowledgeRagDocumentStatus = 'pending' | 'ready' | 'failed'

export type KnowledgeRagSource = {
  id: string
  documentId: string
  title: string
  content: string
  score: number
  ord: number
}

export type KnowledgeRagIngestPayload = {
  projectId: string
  sourceType: KnowledgeRagSourceType
  sourceRef?: string | null
  title: string
  text: string
  replaceDocumentId?: string | null
}

export type KnowledgeRagIngestResult = {
  documentId: string
  status: KnowledgeRagDocumentStatus
  chunkCount: number
  error?: string
}

export type KnowledgeRagRetrievePayload = {
  projectId: string
  query: string
  topK?: number | null
}

export type KnowledgeRagRetrieveResult = {
  sources: KnowledgeRagSource[]
  modelId: string
}

export type KnowledgeRagDocumentSummary = {
  id: string
  projectId: string
  sourceType: KnowledgeRagSourceType
  sourceRef: string | null
  title: string
  status: KnowledgeRagDocumentStatus
  error: string | null
  chunkCount: number
  updatedAt: string | null
}
