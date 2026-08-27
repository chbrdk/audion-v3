import { describe, expect, it, beforeEach } from 'vitest'
import {
  abCompareSystemInstruction,
  shouldEnableAbCompare,
} from '../lib/chat/ab-compare'
import {
  getChatImageDataUrl,
  putChatImage,
  resetChatImageUploadStore,
  resolveChatImages,
} from '../lib/chat/image-upload-store'

describe('ab-compare', () => {
  it('exposes stable winner instruction', () => {
    const instr = abCompareSystemInstruction()
    expect(instr).toContain('### Winner & why')
    expect(instr).toContain('Image A')
    expect(instr).toContain('Image B')
  })

  it('enables only for exactly two images', () => {
    expect(shouldEnableAbCompare(true, 2)).toBe(true)
    expect(shouldEnableAbCompare(true, 1)).toBe(false)
    expect(shouldEnableAbCompare(false, 2)).toBe(false)
  })
})

describe('image-upload-store', () => {
  beforeEach(() => {
    resetChatImageUploadStore()
  })

  it('stores and resolves data URLs', async () => {
    const put = await putChatImage(
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    )
    expect(put.ok).toBe(true)
    if (!put.ok) return
    expect(await getChatImageDataUrl(put.imageId)).toMatch(/^data:image\//)
    const resolved = await resolveChatImages([put.imageId])
    expect(resolved.ok).toBe(true)
  })

  it('rejects non-image data urls', async () => {
    const put = await putChatImage('data:text/plain;base64,YQ==')
    expect(put.ok).toBe(false)
  })

  it('fails resolve for unknown ids', async () => {
    const resolved = await resolveChatImages(['missing-id'])
    expect(resolved.ok).toBe(false)
  })

  it('keeps A/B path when resolving exactly two images', async () => {
    const a = await putChatImage(
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    )
    const b = await putChatImage(
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    )
    expect(a.ok && b.ok).toBe(true)
    if (!a.ok || !b.ok) return
    const resolved = await resolveChatImages([a.imageId, b.imageId])
    expect(resolved.ok).toBe(true)
    if (!resolved.ok) return
    expect(resolved.images).toHaveLength(2)
    expect(shouldEnableAbCompare(true, resolved.images.length)).toBe(true)
  })
})
