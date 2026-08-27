/**
 * Merge retrieved RAG chunks into model-facing user text.
 * Spec: specs/domain/chat-knowledge-rag.md — Relevant context → DOCX → user
 */

import type { KnowledgeRagSource } from '@audion-v3/contracts'

export function formatRelevantContextBlock(sources: KnowledgeRagSource[]): string {
  if (!sources.length) return ''
  const lines = sources.map((s, i) => {
    const title = (s.title || 'Source').trim() || 'Source'
    const snippet = (s.content || '').trim().replace(/\s+/g, ' ').slice(0, 600)
    return `[${i + 1}] ${title} — ${snippet}`
  })
  return `### Relevant context\n${lines.join('\n')}\n\n---\n\n`
}

/** Prepend Relevant context block to already-merged (DOCX + user) text. */
export function mergeRelevantContext(
  modelFacingAfterDocs: string,
  sources: KnowledgeRagSource[],
): string {
  const prefix = formatRelevantContextBlock(sources)
  if (!prefix) return modelFacingAfterDocs || ''
  const rest = (modelFacingAfterDocs || '').trim()
  return rest ? prefix + rest : prefix.replace(/\s+$/, '')
}
