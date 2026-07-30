import type { KnowledgeEntry, KnowledgeEntryWrite } from '@audion-v3/contracts'

function newId(): string {
  return `know-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

export function createKnowledgeEntry(write: KnowledgeEntryWrite): KnowledgeEntry {
  return {
    id: newId(),
    title: write.title.trim() || 'Untitled',
    content: write.content ?? '',
    updatedAt: new Date().toISOString(),
  }
}

export function updateKnowledgeEntry(
  entry: KnowledgeEntry,
  write: KnowledgeEntryWrite,
): KnowledgeEntry {
  return {
    ...entry,
    title: write.title.trim() || 'Untitled',
    content: write.content ?? '',
    updatedAt: new Date().toISOString(),
  }
}
