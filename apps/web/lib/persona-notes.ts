import type { PersonaSection } from '@audion-v3/contracts'
import {
  isEmptyKnowledgeBody,
  knowledgePreviewLine,
  sanitizeKnowledgeHtml,
  toKnowledgeHtml,
} from './project-knowledge'

export {
  isEmptyKnowledgeBody,
  knowledgePreviewLine,
  sanitizeKnowledgeHtml,
  toKnowledgeHtml,
}

export type PersonaNoteCard = {
  id: string
  title: string
  body: string
}

function slugTitle(title: string): string {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return slug || 'note'
}

export function newPersonaNoteId(): string {
  return `note-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

export function normalizePersonaSection(raw: unknown, index = 0): PersonaNoteCard | null {
  if (!raw || typeof raw !== 'object') return null
  const item = raw as Record<string, unknown>
  const title = typeof item.title === 'string' ? item.title.trim() : ''
  const body = typeof item.body === 'string' ? item.body : ''
  if (!title && isEmptyKnowledgeBody(body)) return null
  const id =
    typeof item.id === 'string' && item.id.trim()
      ? item.id.trim()
      : `note-${slugTitle(title || 'section')}-${index}`
  return {
    id,
    title: title || 'Untitled',
    body,
  }
}

export function normalizePersonaSections(raw: unknown): PersonaNoteCard[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item, index) => normalizePersonaSection(item, index))
    .filter((item): item is PersonaNoteCard => Boolean(item))
}

/** Ensure every note has a stable id for Accordion + TipTap cards. */
export function resolvePersonaNotes(sections: PersonaSection[] | undefined | null): PersonaNoteCard[] {
  return normalizePersonaSections(sections ?? [])
}

export function toPersonaWriteSections(notes: PersonaNoteCard[]): PersonaSection[] {
  return notes.map((note) => ({
    id: note.id,
    title: note.title.trim() || 'Untitled',
    body: isEmptyKnowledgeBody(note.body) ? '' : sanitizeKnowledgeHtml(toKnowledgeHtml(note.body)),
  }))
}
