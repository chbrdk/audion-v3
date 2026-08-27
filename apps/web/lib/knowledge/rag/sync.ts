/**
 * Fire-and-forget RAG sync when knowledge is saved in product surfaces.
 * Spec: specs/domain/chat-knowledge-rag.md
 */

import type {
  KnowledgeRagSourceType,
  ProjectKnowledgeChapter,
} from '@audion-v3/contracts'
import { isEmptyKnowledgeBody } from '../../project-knowledge'
import {
  deleteKnowledgeRagDocument,
  findKnowledgeRagDocumentIdBySourceRef,
  ingestKnowledgeText,
  listKnowledgeRagDocuments,
} from './store'
import { isKnowledgeRagEnabled } from './embed'

export function chapterRagSourceType(chapterId: string): KnowledgeRagSourceType {
  return chapterId.startsWith('ch-research-') ? 'research' : 'chapter'
}

export function personaEntrySourceRef(personaId: string, entryId: string): string {
  return `persona:${personaId}:${entryId}`
}

export function tgEntrySourceRef(targetGroupId: string, entryId: string): string {
  return `tg:${targetGroupId}:${entryId}`
}

export async function upsertKnowledgeRagItem(input: {
  projectId: string
  sourceType: KnowledgeRagSourceType
  sourceRef: string
  title: string
  text: string
}): Promise<void> {
  if (!isKnowledgeRagEnabled()) return
  const projectId = input.projectId.trim()
  const sourceRef = input.sourceRef.trim()
  if (!projectId || !sourceRef) return

  const existingId = await findKnowledgeRagDocumentIdBySourceRef(projectId, sourceRef)
  const plainEmpty =
    !input.text.trim() ||
    (input.text.includes('<') ? isEmptyKnowledgeBody(input.text) : false)

  if (plainEmpty) {
    if (existingId) await deleteKnowledgeRagDocument(existingId)
    return
  }

  await ingestKnowledgeText({
    projectId,
    sourceType: input.sourceType,
    sourceRef,
    title: input.title.trim() || 'Untitled',
    text: input.text,
    replaceDocumentId: existingId,
  })
}

/** Sync all project chapters; drop orphaned chapter/research RAG docs. */
export async function syncProjectChaptersToRag(
  projectId: string,
  chapters: ProjectKnowledgeChapter[],
): Promise<void> {
  if (!isKnowledgeRagEnabled()) return
  const pid = projectId.trim()
  if (!pid) return

  const active = new Set(chapters.map((c) => c.id))
  for (const chapter of chapters) {
    await upsertKnowledgeRagItem({
      projectId: pid,
      sourceType: chapterRagSourceType(chapter.id),
      sourceRef: chapter.id,
      title: chapter.title,
      text: chapter.body,
    })
  }

  const indexed = await listKnowledgeRagDocuments(pid)
  for (const doc of indexed) {
    if (doc.sourceType !== 'chapter' && doc.sourceType !== 'research') continue
    if (doc.sourceRef && !active.has(doc.sourceRef)) {
      await deleteKnowledgeRagDocument(doc.id)
    }
  }
}

/** Non-blocking schedule after project knowledge PATCH / research apply. */
export function scheduleProjectChaptersRagSync(
  projectId: string,
  chapters: ProjectKnowledgeChapter[],
): void {
  void syncProjectChaptersToRag(projectId, chapters).catch(() => undefined)
}

export function scheduleKnowledgeEntryRagSync(input: {
  projectId: string | null | undefined
  sourceRef: string
  title: string
  text: string
}): void {
  const projectId = input.projectId?.trim()
  if (!projectId) return
  void upsertKnowledgeRagItem({
    projectId,
    sourceType: 'entry',
    sourceRef: input.sourceRef,
    title: input.title,
    text: input.text,
  }).catch(() => undefined)
}

export function scheduleKnowledgeEntryRagDelete(input: {
  projectId: string | null | undefined
  sourceRef: string
}): void {
  const projectId = input.projectId?.trim()
  if (!projectId) return
  void (async () => {
    const id = await findKnowledgeRagDocumentIdBySourceRef(projectId, input.sourceRef)
    if (id) await deleteKnowledgeRagDocument(id)
  })().catch(() => undefined)
}
