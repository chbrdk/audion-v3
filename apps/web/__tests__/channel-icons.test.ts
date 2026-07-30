import { describe, expect, it } from 'vitest'
import {
  CHANNEL_PICKER_OPTIONS,
  channelLabelForKey,
  channelLogoPath,
  resolveChannelIconKey,
} from '../lib/channel-icons'

describe('channel icons', () => {
  it('resolves known channels and fuzzy labels', () => {
    expect(resolveChannelIconKey('Slack')).toBe('slack')
    expect(resolveChannelIconKey('Figma')).toBe('figma')
    expect(resolveChannelIconKey('Weekly product review')).toBe('review')
    expect(resolveChannelIconKey('Microsoft Teams')).toBe('teams')
    expect(resolveChannelIconKey('Instagram')).toBe('instagram')
    expect(resolveChannelIconKey('Twitter')).toBe('x')
    expect(resolveChannelIconKey('TikTok')).toBe('tiktok')
    expect(resolveChannelIconKey('WhatsApp')).toBe('whatsapp')
    expect(resolveChannelIconKey('Unknown tool')).toBe('generic')
  })

  it('maps brand channels to local logo assets', () => {
    expect(channelLogoPath('slack')).toBe('/fixtures/channels/slack.svg')
    expect(channelLogoPath('figma')).toBe('/fixtures/channels/figma.svg')
    expect(channelLogoPath('instagram')).toBe('/fixtures/channels/instagram.svg')
    expect(channelLogoPath('youtube')).toBe('/fixtures/channels/youtube.svg')
    expect(channelLogoPath('x')).toBe('/fixtures/channels/x.svg')
    expect(channelLogoPath('review')).toBeNull()
  })

  it('exposes a curated picker with social messaging and work groups', () => {
    expect(CHANNEL_PICKER_OPTIONS.length).toBeGreaterThanOrEqual(24)
    expect(CHANNEL_PICKER_OPTIONS.map((o) => o.key)).toEqual(
      expect.arrayContaining(['facebook', 'instagram', 'tiktok', 'whatsapp', 'slack']),
    )
    expect(CHANNEL_PICKER_OPTIONS.filter((o) => o.group === 'social').length).toBeGreaterThanOrEqual(8)
    expect(channelLabelForKey('slack')).toBe('Slack')
    expect(channelLabelForKey('x')).toBe('X')
    expect(channelLabelForKey('meet')).toBe('Meet')
  })
})
