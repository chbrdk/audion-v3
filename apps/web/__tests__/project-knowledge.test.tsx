import { describe, expect, it } from 'vitest'
import {
  isEmptyKnowledgeBody,
  joinCompanyContext,
  knowledgePreviewLine,
  sanitizeKnowledgeHtml,
  stripKnowledgeHtml,
  toKnowledgeHtml,
} from '../lib/project-knowledge'

describe('project knowledge html helpers', () => {
  it('wraps plain text and strips html for preview / join', () => {
    expect(toKnowledgeHtml('Hello\n\nWorld')).toBe('<p>Hello</p><p>World</p>')
    expect(stripKnowledgeHtml('<p>Hello <strong>there</strong></p>')).toBe('Hello there')
    expect(knowledgePreviewLine('<p>Short</p>')).toBe('Short')
    expect(isEmptyKnowledgeBody('<p></p>')).toBe(true)
    expect(
      joinCompanyContext([
        { id: 'a', title: 'A', body: '<p>One</p>' },
        { id: 'b', title: 'B', body: '<p>Two</p>' },
      ]),
    ).toBe('One\n\nTwo')
  })

  it('sanitizes disallowed tags from chapter html', () => {
    const dirty = '<p>Safe</p><script>alert(1)</script><img src=x onerror=alert(1) />'
    const clean = sanitizeKnowledgeHtml(dirty)
    expect(clean).toContain('<p>Safe</p>')
    expect(clean).not.toContain('script')
    expect(clean).not.toContain('img')
  })
})
