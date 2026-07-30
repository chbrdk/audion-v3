import { describe, expect, it } from 'vitest'
import {
  normalizePersonaSections,
  resolvePersonaNotes,
  toPersonaWriteSections,
} from '../lib/persona-notes'

describe('persona notes helpers', () => {
  it('assigns stable ids when missing and keeps explicit ids', () => {
    expect(
      normalizePersonaSections([
        { title: 'Mindset', body: 'A' },
        { id: 'custom', title: 'Context', body: 'B' },
      ]),
    ).toEqual([
      { id: 'note-mindset-0', title: 'Mindset', body: 'A' },
      { id: 'custom', title: 'Context', body: 'B' },
    ])
  })

  it('sanitizes bodies for write payload', () => {
    const notes = resolvePersonaNotes([{ title: 'Mindset', body: 'Hello' }])
    expect(toPersonaWriteSections(notes)).toEqual([
      { id: 'note-mindset-0', title: 'Mindset', body: '<p>Hello</p>' },
    ])
  })
})
