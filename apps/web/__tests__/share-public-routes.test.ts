import { describe, expect, it } from 'vitest'
import { isPublicChatShareRequest } from '../lib/chat/share-public-routes'

describe('isPublicChatShareRequest', () => {
  it('allows guest /chat when personaId and projectId are set', () => {
    const params = new URLSearchParams({
      personaId: 'persona-katrin-weber-mt0a2mqw',
      projectId: 'proj-viessmann-mt09sb7u',
    })
    expect(isPublicChatShareRequest('/chat', params)).toBe(true)
  })

  it('requires auth for /chat without share params', () => {
    expect(isPublicChatShareRequest('/chat', new URLSearchParams())).toBe(false)
  })
})
