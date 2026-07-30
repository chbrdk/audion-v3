import { describe, expect, it } from 'vitest'
import {
  buildChatHref,
  buildChatPrefillDraft,
  pickWaveChatPersonaId,
} from '../lib/chat/prefill'
import { paths } from '../lib/paths'

describe('chat prefill', () => {
  it('builds draft with study/wave header', () => {
    expect(
      buildChatPrefillDraft({
        prompt: 'F2.1 Zweck?',
        studyName: 'EBM',
        waveKey: 'wave-1',
      }),
    ).toBe('[UX Study · Study: EBM · Wave: wave-1]\n\nF2.1 Zweck?')
  })

  it('builds href with persona and study context', () => {
    const href = buildChatHref({
      prompt: 'F2.1 Zweck?',
      personaId: 'persona-alex-nachruester',
      studyId: 'study-1',
      waveId: 'wave-1',
      studyName: 'EBM',
      waveKey: 'audion-mcp',
    })
    expect(href).toContain('/chat?')
    expect(href).toContain('prompt=')
    expect(href).toContain('personaId=persona-alex-nachruester')
    expect(href).toContain('studyId=study-1')
    expect(href).toContain('waveKey=audion-mcp')
    expect(paths.routes.chatWithContext({ prompt: 'hi', studyId: 's' })).toContain('studyId=s')
  })

  it('picks validEvidence persona first', () => {
    expect(
      pickWaveChatPersonaId([
        { personaId: 'a', validEvidence: false },
        { personaId: 'b', validEvidence: true },
      ]),
    ).toBe('b')
    expect(pickWaveChatPersonaId([{ personaId: 'a', validEvidence: null }])).toBe('a')
  })
})
