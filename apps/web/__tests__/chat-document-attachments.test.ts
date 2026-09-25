import JSZip from 'jszip'
import { describe, expect, it, beforeEach } from 'vitest'
import * as XLSX from 'xlsx'
import { extractDocxText } from '../lib/chat/extract-docx'
import { extractMarkdownText, extractPlainText } from '../lib/chat/extract-plain'
import { extractPptxText } from '../lib/chat/extract-pptx'
import { extractXlsxText } from '../lib/chat/extract-xlsx'
import {
  extensionOfChatDocument,
  isChatDocumentFilename,
} from '../lib/chat/document-formats'
import {
  putChatDocument,
  resetChatDocumentUploadStore,
  resolveChatDocuments,
} from '../lib/chat/document-upload-store'
import { mergeUserMessageWithDocuments } from '../lib/chat/merge-documents'
import { paths } from '../lib/paths'
import { readFileSync } from 'node:fs'
import path from 'node:path'

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

async function buildMinimalPptx(slideText: string): Promise<Buffer> {
  const zip = new JSZip()
  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/ppt/slides/slide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
</Types>`,
  )
  zip.folder('_rels')?.file(
    '.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
</Relationships>`,
  )
  zip.folder('ppt')?.file(
    'presentation.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:sldIdLst><p:sldId id="256" r:id="rId1"/></p:sldIdLst>
</p:presentation>`,
  )
  zip.folder('ppt')?.folder('_rels')?.file(
    'presentation.xml.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide1.xml"/>
</Relationships>`,
  )
  zip.folder('ppt')?.folder('slides')?.file(
    'slide1.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <p:cSld><p:spTree><p:sp><p:txBody><a:p><a:r><a:t>${slideText}</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld>
</p:sld>`,
  )
  return Buffer.from(await zip.generateAsync({ type: 'nodebuffer' }))
}

function buildMinimalXlsx(): Buffer {
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet([
    ['Projekt', 'Zielgruppen'],
    ['Vaillant', 3],
    ['Vaillant Group', 1],
  ])
  XLSX.utils.book_append_sheet(wb, ws, 'Overview')
  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }))
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

describe('document format registry', () => {
  it('accepts planned extensions', () => {
    expect(isChatDocumentFilename('brief.docx')).toBe(true)
    expect(isChatDocumentFilename('scan.PDF')).toBe(true)
    expect(isChatDocumentFilename('deck.pptx')).toBe(true)
    expect(isChatDocumentFilename('notes.md')).toBe(true)
    expect(isChatDocumentFilename('readme.markdown')).toBe(true)
    expect(isChatDocumentFilename('plain.txt')).toBe(true)
    expect(isChatDocumentFilename('table.xlsx')).toBe(true)
    expect(isChatDocumentFilename('legacy.xls')).toBe(true)
    expect(isChatDocumentFilename('notes.doc')).toBe(false)
    expect(extensionOfChatDocument('a.XLSX')).toBe('.xlsx')
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

describe('extract plain / markdown / pptx / xlsx', () => {
  it('extracts utf8 plain and markdown', () => {
    expect(extractPlainText(Buffer.from('hello\nworld'), 100).text).toContain('hello')
    const md = extractMarkdownText(Buffer.from('## Title\n\n**Bold** and [x](https://e.example)'), 200)
    expect(md.text).toContain('Title')
    expect(md.text).toContain('Bold')
    expect(md.text).toContain('x')
    expect(md.text).not.toContain('https://')
  })

  it('extracts pptx slide text', async () => {
    const buf = await buildMinimalPptx('Slide hello')
    const { text } = await extractPptxText(buf, 10_000)
    expect(text).toContain('Slide hello')
  })

  it('extracts xlsx as TSV sheets', () => {
    const { text } = extractXlsxText(buildMinimalXlsx(), 10_000)
    expect(text).toContain('### Sheet: Overview')
    expect(text).toContain('Projekt')
    expect(text).toContain('Vaillant')
    expect(text).toMatch(/Vaillant\t3/)
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

  it('stores txt and xlsx uploads', async () => {
    const txt = await putChatDocument({
      filename: 'note.txt',
      buffer: Buffer.from('Plain note for persona'),
    })
    expect(txt.ok).toBe(true)
    const xlsx = await putChatDocument({
      filename: 'table.xlsx',
      buffer: buildMinimalXlsx(),
    })
    expect(xlsx.ok).toBe(true)
    if (!xlsx.ok) return
    const resolved = await resolveChatDocuments([xlsx.documentId])
    expect(resolved.ok).toBe(true)
    if (!resolved.ok) return
    expect(resolved.documents[0]?.extractedText).toContain('Vaillant')
  })

  it('rejects non-supported filenames', async () => {
    const put = await putChatDocument({
      filename: 'notes.doc',
      buffer: Buffer.from('x'),
    })
    expect(put.ok).toBe(false)
    if (put.ok) return
    expect(put.status).toBe(415)
  })

  it('rejects empty files', async () => {
    const put = await putChatDocument({
      filename: 'empty.txt',
      buffer: Buffer.alloc(0),
    })
    expect(put.ok).toBe(false)
    if (put.ok) return
    expect(put.status).toBe(400)
  })

  it('fails resolve for unknown ids', async () => {
    const resolved = await resolveChatDocuments(['missing-id'])
    expect(resolved.ok).toBe(false)
  })
})

describe('persona chat document surface smoke', () => {
  const root = path.resolve(__dirname, '..')

  it('composer accepts multi-format documents', () => {
    const panel = readFileSync(path.join(root, 'components/audion-chat-panel.tsx'), 'utf8')
    expect(panel).toContain('CHAT_DOCUMENT_UPLOAD_ACCEPT')
    expect(panel).toContain('isChatDocumentFilename')
    expect(panel).toContain('chatDocumentMaxPerTurn')
  })

  it('spec lists format matrix', () => {
    const spec = readFileSync(
      path.join(root, '../../specs/domain/chat-document-attachments.md'),
      'utf8',
    )
    expect(spec).toContain('.xlsx')
    expect(spec).toContain('.pdf')
    expect(spec).toContain('documentIds')
  })

  it('paths expose accept + caps', () => {
    expect(paths.chatDocumentMaxPerTurn).toBe(4)
    expect(paths.chatDocumentUploadAccept).toContain('.xlsx')
    expect(paths.chatDocumentExtensions).toContain('.pptx')
  })
})
