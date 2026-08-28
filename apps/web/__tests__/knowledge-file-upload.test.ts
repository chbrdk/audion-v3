import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'
import { extractFileForKnowledge } from '../lib/knowledge/docx-to-knowledge'
import { isKnowledgeUploadFilename } from '../lib/knowledge/upload-formats'

function fileFrom(name: string, data: Buffer | string, type = 'application/octet-stream'): File {
  const bytes =
    typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(data)
  return new File([bytes], name, { type })
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
</Types>`,
  )
  zip.folder('ppt')?.folder('slides')?.file(
    'slide1.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld><p:spTree>
    <p:sp><p:txBody><a:p><a:r><a:t>${slideText}</a:t></a:r></a:p></p:txBody></p:sp>
  </p:spTree></p:cSld>
</p:sld>`,
  )
  return Buffer.from(await zip.generateAsync({ type: 'nodebuffer' }))
}

describe('isKnowledgeUploadFilename', () => {
  it('accepts supported extensions', () => {
    expect(isKnowledgeUploadFilename('a.docx')).toBe(true)
    expect(isKnowledgeUploadFilename('b.PDF')).toBe(true)
    expect(isKnowledgeUploadFilename('c.pptx')).toBe(true)
    expect(isKnowledgeUploadFilename('d.md')).toBe(true)
    expect(isKnowledgeUploadFilename('e.txt')).toBe(false)
  })
})

describe('extractFileForKnowledge', () => {
  it('extracts markdown', async () => {
    const md = `---\ntitle: x\n---\n# Hello\n\n**Bold** and [link](https://x.test)`
    const out = await extractFileForKnowledge(fileFrom('brief.md', md, 'text/markdown'))
    expect(out.ok).toBe(true)
    if (!out.ok) return
    expect(out.format).toBe('.md')
    expect(out.title).toBe('brief')
    expect(out.text).toContain('Hello')
    expect(out.text).toContain('Bold')
    expect(out.text).toContain('link')
    expect(out.html).toContain('<p')
  })

  it('extracts pptx slide text', async () => {
    const buf = await buildMinimalPptx('Slide one brand brief')
    const out = await extractFileForKnowledge(
      fileFrom(
        'deck.pptx',
        buf,
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      ),
    )
    expect(out.ok).toBe(true)
    if (!out.ok) return
    expect(out.format).toBe('.pptx')
    expect(out.text).toContain('Slide one brand brief')
  })

  it('rejects unsupported types', async () => {
    const out = await extractFileForKnowledge(fileFrom('notes.txt', 'hello'))
    expect(out.ok).toBe(false)
    if (out.ok) return
    expect(out.status).toBe(415)
  })

  it('extracts text from a minimal PDF', async () => {
    // Tiny Type1 Helvetica PDF (pdf-parse / pdfjs legacy).
    const minimal = Buffer.from(`%PDF-1.1
1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj
2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj
3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 144] /Contents 4 0 R /Resources<< /Font<< /F1 5 0 R >> >> >>endobj
4 0 obj<< /Length 44 >>stream
BT /F1 24 Tf 100 100 Td (Hello) Tj ET
endstream
endobj
5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000266 00000 n 
0000000360 00000 n 
trailer<< /Size 6 /Root 1 0 R >>
startxref
447
%%EOF`)
    const out = await extractFileForKnowledge(
      fileFrom('brief.pdf', minimal, 'application/pdf'),
    )
    expect(out.ok).toBe(true)
    if (!out.ok) return
    expect(out.format).toBe('.pdf')
    expect(out.title).toBe('brief')
    expect(out.text).toMatch(/Hello/i)
  })
})
