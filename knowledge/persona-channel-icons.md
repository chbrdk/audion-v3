# Persona channel icons

Channel chips render as **monochrome avatar bubbles** (logo only). The channel name is exposed via `title` / `aria-label` tooltip, not as visible text.

## Editing

- Component: `apps/web/components/persona-channel-bubbles.tsx` (client)
- Click or right-click a bubble → floating **icon picker** grouped Social · Messaging · Work
- Trailing dashed “+” bubble / section “+” → add via the same picker
- Edit menu includes **Remove channel** → confirm `Dialog` → PATCH
- Persist: `PATCH paths.routes.apiPersonaDetail(id)` with `{ channels: next }`

## Assets

- Public logos: `apps/web/public/fixtures/channels/*.svg`
- Base path: `paths.channelLogoBasePath` (`/fixtures/channels`)
- Registry: `apps/web/lib/channel-icons.tsx`
- Picker list: `CHANNEL_PICKER_OPTIONS` / `channelLabelForKey()` / groups
- Brand marks are painted via CSS `mask-image` + `currentColor` (single ink/accent tone)

## Social (2026 marketer stack)

Facebook · Instagram · LinkedIn · YouTube · TikTok · X · Threads · Pinterest · Reddit · Snapchat · Xing

## Messaging

WhatsApp · Telegram · Discord · Slack · Teams · Email · Newsletter · Phone

## Work / collab

Figma · FigJam · Notion · Miro · Zoom · Meet · Review · Web

## Fallback glyphs

`review`, `phone`, `web`, `generic` — line icons when no brand SVG.

## Extend

1. Drop `{key}.svg` into `public/fixtures/channels/`
2. Add key to `ChannelIconKey`, `CHANNEL_BRAND_LOGOS`, aliases, and `CHANNEL_PICKER_OPTIONS` (+ group)
3. Cover resolve / picker in `__tests__/channel-icons.test.ts`
