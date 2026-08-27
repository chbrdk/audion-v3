import { describe, expect, it } from 'vitest'
import { getStaticProductSwitcherItems, plexonProductsCatalogUrl } from '../lib/platform-product-switcher'

describe('platform-product-switcher', () => {
  it('includes audion and plexon with staging fallbacks', () => {
    const items = getStaticProductSwitcherItems()
    expect(items.some((item) => item.id === 'audion')).toBe(true)
    expect(items.some((item) => item.id === 'plexon')).toBe(true)
    expect(items.find((item) => item.id === 'audion')?.href).toMatch(/^https?:\/\//)
  })

  it('builds plexon products catalog url', () => {
    expect(plexonProductsCatalogUrl()).toMatch(/\/products$/)
  })
})
