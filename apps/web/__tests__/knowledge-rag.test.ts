import { describe, expect, it } from 'vitest'
import { chunkPlainText, stripHtmlToPlain } from '../lib/knowledge/rag/chunker'
import { cosineSimilarity } from '../lib/knowledge/rag/embed'
import { mergeRelevantContext } from '../lib/knowledge/rag/merge-context'
import { mergeUserMessageWithDocuments } from '../lib/chat/merge-documents'

describe('knowledge rag chunker', () => {
  it('strips html to plain text', () => {
    expect(stripHtmlToPlain('<p>Hello <b>world</b></p>')).toContain('Hello')
    expect(stripHtmlToPlain('<p>Hello <b>world</b></p>')).not.toContain('<')
  })

  it('chunks long text with overlap and cap', () => {
    const text = Array.from({ length: 40 }, (_, i) => `Paragraph ${i}. ${'x'.repeat(80)}`).join(
      '\n\n',
    )
    const chunks = chunkPlainText(text, {
      chunkChars: 200,
      overlapChars: 40,
      maxChunks: 5,
    })
    expect(chunks.length).toBeGreaterThan(1)
    expect(chunks.length).toBeLessThanOrEqual(5)
  })
})

describe('knowledge rag merge order', () => {
  it('puts Relevant context before DOCX and user text', () => {
    const withDocs = mergeUserMessageWithDocuments('Please summarize.', [
      { filename: 'memo.docx', extractedText: 'Doc body' },
    ])
    const merged = mergeRelevantContext(withDocs, [
      {
        id: 'c1',
        documentId: 'd1',
        title: 'Research',
        content: 'Chunk snippet about pricing',
        score: 0.9,
        ord: 0,
      },
    ])
    expect(merged.indexOf('### Relevant context')).toBe(0)
    expect(merged.indexOf('### Attached document')).toBeGreaterThan(
      merged.indexOf('### Relevant context'),
    )
    expect(merged.indexOf('Please summarize.')).toBeGreaterThan(
      merged.indexOf('### Attached document'),
    )
  })
})

describe('cosineSimilarity', () => {
  it('scores identical vectors as 1', () => {
    expect(cosineSimilarity([1, 0, 0], [1, 0, 0])).toBeCloseTo(1)
  })

  it('scores orthogonal vectors as 0', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0)
  })
})

describe('knowledge rag sync refs', () => {
  it('maps research chapter ids', async () => {
    const { chapterRagSourceType, personaEntrySourceRef, tgEntrySourceRef } = await import(
      '../lib/knowledge/rag/sync'
    )
    expect(chapterRagSourceType('ch-research-market')).toBe('research')
    expect(chapterRagSourceType('ch-company')).toBe('chapter')
    expect(personaEntrySourceRef('p1', 'e1')).toBe('persona:p1:e1')
    expect(tgEntrySourceRef('tg1', 'e1')).toBe('tg:tg1:e1')
  })
})
