import React from 'react'
import { paths } from './paths'

/** Known channel brand / glyph keys — extend when adding logos. */
export type ChannelIconKey =
  | 'facebook'
  | 'instagram'
  | 'linkedin'
  | 'youtube'
  | 'tiktok'
  | 'x'
  | 'threads'
  | 'pinterest'
  | 'reddit'
  | 'snapchat'
  | 'xing'
  | 'whatsapp'
  | 'telegram'
  | 'discord'
  | 'slack'
  | 'teams'
  | 'email'
  | 'newsletter'
  | 'figma'
  | 'figjam'
  | 'miro'
  | 'notion'
  | 'zoom'
  | 'meet'
  | 'review'
  | 'phone'
  | 'web'
  | 'generic'

export type ChannelPickerGroup = 'social' | 'messaging' | 'work'

export type ChannelPickerOption = {
  key: ChannelIconKey
  label: string
  group: ChannelPickerGroup
}

/** Curated picker — social first (2026 marketer stack), then messaging, then work tools. */
export const CHANNEL_PICKER_OPTIONS: ReadonlyArray<ChannelPickerOption> = [
  { key: 'facebook', label: 'Facebook', group: 'social' },
  { key: 'instagram', label: 'Instagram', group: 'social' },
  { key: 'linkedin', label: 'LinkedIn', group: 'social' },
  { key: 'youtube', label: 'YouTube', group: 'social' },
  { key: 'tiktok', label: 'TikTok', group: 'social' },
  { key: 'x', label: 'X', group: 'social' },
  { key: 'threads', label: 'Threads', group: 'social' },
  { key: 'pinterest', label: 'Pinterest', group: 'social' },
  { key: 'reddit', label: 'Reddit', group: 'social' },
  { key: 'snapchat', label: 'Snapchat', group: 'social' },
  { key: 'xing', label: 'Xing', group: 'social' },
  { key: 'whatsapp', label: 'WhatsApp', group: 'messaging' },
  { key: 'telegram', label: 'Telegram', group: 'messaging' },
  { key: 'discord', label: 'Discord', group: 'messaging' },
  { key: 'slack', label: 'Slack', group: 'messaging' },
  { key: 'teams', label: 'Teams', group: 'messaging' },
  { key: 'email', label: 'Email', group: 'messaging' },
  { key: 'newsletter', label: 'Newsletter', group: 'messaging' },
  { key: 'phone', label: 'Phone', group: 'messaging' },
  { key: 'figma', label: 'Figma', group: 'work' },
  { key: 'figjam', label: 'FigJam', group: 'work' },
  { key: 'miro', label: 'Miro', group: 'work' },
  { key: 'notion', label: 'Notion', group: 'work' },
  { key: 'zoom', label: 'Zoom', group: 'work' },
  { key: 'meet', label: 'Meet', group: 'work' },
  { key: 'review', label: 'Review', group: 'work' },
  { key: 'web', label: 'Web', group: 'work' },
] as const

export const CHANNEL_PICKER_GROUP_LABELS: Record<ChannelPickerGroup, string> = {
  social: 'Social',
  messaging: 'Messaging',
  work: 'Work',
}

export function channelLabelForKey(key: ChannelIconKey): string {
  return CHANNEL_PICKER_OPTIONS.find((o) => o.key === key)?.label ?? 'Channel'
}

/**
 * Normalized label → icon key.
 * Keep aliases lowercase; `resolveChannelIconKey` normalizes input.
 */
export const CHANNEL_ICON_ALIASES: Record<string, ChannelIconKey> = {
  facebook: 'facebook',
  fb: 'facebook',
  meta: 'facebook',
  instagram: 'instagram',
  ig: 'instagram',
  insta: 'instagram',
  linkedin: 'linkedin',
  youtube: 'youtube',
  yt: 'youtube',
  tiktok: 'tiktok',
  x: 'x',
  twitter: 'x',
  'x / twitter': 'x',
  threads: 'threads',
  pinterest: 'pinterest',
  reddit: 'reddit',
  snapchat: 'snapchat',
  snap: 'snapchat',
  xing: 'xing',
  whatsapp: 'whatsapp',
  wa: 'whatsapp',
  telegram: 'telegram',
  discord: 'discord',
  slack: 'slack',
  teams: 'teams',
  'microsoft teams': 'teams',
  email: 'email',
  mail: 'email',
  'e-mail': 'email',
  gmail: 'email',
  newsletter: 'newsletter',
  mailchimp: 'newsletter',
  figma: 'figma',
  figjam: 'figjam',
  miro: 'miro',
  notion: 'notion',
  zoom: 'zoom',
  meet: 'meet',
  'google meet': 'meet',
  review: 'review',
  'product review': 'review',
  'weekly product review': 'review',
  phone: 'phone',
  call: 'phone',
  web: 'web',
  website: 'web',
  browser: 'web',
}

/** Keys that have a brand logo SVG under `paths.channelLogoBasePath`. */
export const CHANNEL_BRAND_LOGOS = new Set<ChannelIconKey>([
  'facebook',
  'instagram',
  'linkedin',
  'youtube',
  'tiktok',
  'x',
  'threads',
  'pinterest',
  'reddit',
  'snapchat',
  'xing',
  'whatsapp',
  'telegram',
  'discord',
  'slack',
  'teams',
  'email',
  'newsletter',
  'figma',
  'figjam',
  'miro',
  'notion',
  'zoom',
  'meet',
])

export function normalizeChannelLabel(label: string): string {
  return label.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function resolveChannelIconKey(label: string): ChannelIconKey {
  const normalized = normalizeChannelLabel(label)
  if (CHANNEL_ICON_ALIASES[normalized]) return CHANNEL_ICON_ALIASES[normalized]!
  for (const [alias, key] of Object.entries(CHANNEL_ICON_ALIASES)) {
    if (normalized.includes(alias)) return key
  }
  return 'generic'
}

export function channelLogoPath(key: ChannelIconKey): string | null {
  if (!CHANNEL_BRAND_LOGOS.has(key)) return null
  return `${paths.channelLogoBasePath}/${key}.svg`
}

function Glyph({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <svg
      className={['ui-icon', 'audion-channel-icon', className].filter(Boolean).join(' ')}
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      {children}
    </svg>
  )
}

const stroke = {
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

function FallbackGlyph({
  channelKey,
  className,
}: {
  channelKey: ChannelIconKey
  className?: string
}) {
  switch (channelKey) {
    case 'review':
      return (
        <Glyph className={className}>
          <path d="M7 4.5h10v15H7z" {...stroke} />
          <path d="M10 8.5h4M10 12h4M10 15.5h2.5" {...stroke} />
        </Glyph>
      )
    case 'phone':
      return (
        <Glyph className={className}>
          <path
            d="M8 4.5h3.5l1 3.5-2 1.5a11 11 0 0 0 4.5 4.5l1.5-2 3.5 1V18a2 2 0 0 1-2 2A14.5 14.5 0 0 1 4.5 6.5a2 2 0 0 1 2-2Z"
            {...stroke}
          />
        </Glyph>
      )
    case 'web':
      return (
        <Glyph className={className}>
          <circle cx="12" cy="12" r="8" {...stroke} />
          <path d="M4.5 12h15M12 4.5c2.5 2.8 2.5 12.2 0 15M12 4.5c-2.5 2.8-2.5 12.2 0 15" {...stroke} />
        </Glyph>
      )
    default:
      return (
        <Glyph className={className}>
          <path d="M8 10.5a4 4 0 0 1 8 0c0 2.5-2 3.5-2 5.5h-4c0-2-2-3-2-5.5Z" {...stroke} />
          <path d="M10.5 18.5h3" {...stroke} />
        </Glyph>
      )
  }
}

/** Brand logo (monochrome mask) or fallback glyph for a channel label. */
export function ChannelIcon({
  channel,
  className,
}: {
  channel: string
  className?: string
}) {
  const key = resolveChannelIconKey(channel)
  const logo = channelLogoPath(key)

  if (logo) {
    return (
      <span
        className={['audion-channel-icon', 'audion-channel-logo', className].filter(Boolean).join(' ')}
        style={{
          WebkitMaskImage: `url(${logo})`,
          maskImage: `url(${logo})`,
        }}
        aria-hidden
      />
    )
  }

  return <FallbackGlyph channelKey={key} className={className} />
}
