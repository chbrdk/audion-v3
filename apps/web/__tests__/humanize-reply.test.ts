import { describe, expect, it } from 'vitest'
import { humanizePersonaReply } from '../lib/chat/humanize-reply'

describe('humanizePersonaReply', () => {
  it('strips emoji and trailing interview closers', () => {
    const out = humanizePersonaReply(
      'Hey! Mir geht’s gut 😊 Ich sitze an Plänen.\n\nUnd bei dir?',
    )
    expect(out).not.toMatch(/😊/)
    expect(out).not.toMatch(/Und bei dir/i)
    expect(out).toMatch(/Mir geht/i)
  })

  it('strips category labels and coach offers', () => {
    const out = humanizePersonaReply(
      '**Unbranded / kategorial:**\n1. Frage eins\n\nWenn du willst, formuliere ich mehr.',
    )
    expect(out).not.toMatch(/Unbranded/i)
    expect(out).not.toMatch(/Wenn du willst/i)
    expect(out).toMatch(/Frage eins/)
  })

  it('removes markdown heading lines', () => {
    const out = humanizePersonaReply('### Titel\nKlar, ich mach das.')
    expect(out).not.toMatch(/###/)
    expect(out).toMatch(/Klar/)
  })
})
