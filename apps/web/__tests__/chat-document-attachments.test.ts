import JSZip from 'jszip'
import { describe, expect, it, beforeEach } from 'vitest'
import { extractDocxText } from '../lib/chat/extract-docx'
import {
  putChatDocument,
  resetChatDocumentUploadStore,
  resolveChatDocuments,
} from '../lib/chat/document-upload-store'
import { mergeUserMessageWithDocuments } from '../lib/chat/merge-documents'

async function buildMinimalDocx(paragraphText: string): Promise<Buffer> {
  const zip = new JSZip()
  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`,
  )
  zip.folder('_rels')?.file(
    '.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,
  )
  zip.folder('word')?.file(
    'document.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>${paragraphText}</w:t></w:r></w:p>
  </w:body>
</w:document>`,
  )
  return Buffer.from(await zip.generateAsync({ type: 'nodebuffer' }))
}

describe('mergeUserMessageWithDocuments', () => {
  it('inserts v2-style document prefix before user content', () => {
    const out = mergeUserMessageWithDocuments('Please summarize.', [
      { filename: 'memo.docx', extractedText: 'Line one' },
    ])
    expect(out).toContain('### Attached document: memo.docx')
    expect(out).toContain('Line one')
    expect(out).toContain('Please summarize.')
    expect(out.indexOf('Line one')).toBeLessThan(out.indexOf('Please summarize.'))
  })

  it('joins multiple docs with separators', () => {
    const out = mergeUserMessageWithDocuments('Q', [
      { filename: 'a.docx', extractedText: 'A' },
      { filename: 'b.docx', extractedText: 'B' },
    ])
    expect(out).toContain('### Attached document: a.docx')
    expect(out).toContain('### Attached document: b.docx')
    expect(out).toContain('\n\n---\n\n')
  })
})

describe('extractDocxText', () => {
  it('extracts plain text from a minimal docx', async () => {
    const buf = await buildMinimalDocx('Hello from vitest')
    const { text, truncated } = await extractDocxText(buf, 10_000)
    expect(text).toContain('Hello from vitest')
    expect(truncated).toBe(false)
  })

  it('truncates long extracted text', async () => {
    const buf = await buildMinimalDocx('x'.repeat(500))
    const { text, truncated } = await extractDocxText(buf, 100)
    expect(truncated).toBe(true)
    expect(text).toContain('[… truncated]')
    expect(text.length).toBeLessThanOrEqual(100)
  })
})

describe('document-upload-store', () => {
  beforeEach(() => {
    resetChatDocumentUploadStore()
  })

  it('stores and resolves extracted text in memory', async () => {
    const buf = await buildMinimalDocx('Brief body')
    const put = await putChatDocument({ filename: 'brief.docx', buffer: buf })
    expect(put.ok).toBe(true)
    if (!put.ok) return
    expect(put.filename).toBe('brief.docx')
    expect(put.charCount).toBeGreaterThan(0)
    const resolved = await resolveChatDocuments([put.documentId])
    expect(resolved.ok).toBe(true)
    if (!resolved.ok) return
    expect(resolved.documents[0]?.extractedText).toContain('Brief body')
  })

  it('rejects non-docx filenames', async () => {
    const put = await putChatDocument({
      filename: 'notes.doc',
      buffer: Buffer.from('x'),
    })
    expect(put.ok).toBe(false)
    if (put.ok) return
    expect(put.status).toBe(415)
  })

  it('fails resolve for unknown ids', async () => {
    const resolved = await resolveChatDocuments(['missing-id'])
    expect(resolved.ok).toBe(false)
  })
})
