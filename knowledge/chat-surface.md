# Chat surface (AUDION v3)

**Date:** 2026-07-29

## Direction

Conversation sits on the page — **no Panel / card chrome**. Typography carries hierarchy. **Visual chrome lives in `@msqdx/ui`** (`.chat-panel-open`).

| Layer | Treatment |
|-------|-----------|
| Shell | No page title; persona Select in `topbar-brand` (`leading`); History in `topbar-right` |
| Panel | `.chat-panel.chat-panel-open` |
| User turn | Right-aligned display type, large light weight, tight tracking |
| Assistant | Left-aligned `--font-body`, ~1.05–1.2rem, weight 300, lh ~1.7; display headings |
| Empty | Display line as invitation (`.chat-empty`) |
| Composer | Starts narrow (~28rem), expands to ~52rem on hover/focus/`is-expanded`; brand underline; icon-only send (`.chat-send-icon`) |
| Motion | Soft turn fade-up (`chat-turn-in`); respects `prefers-reduced-motion` |

## Product-only CSS

- `.audion-chat-persona-field` / `.audion-chat-history-link`
- `--chat-panel-open-min-height` shell offset on `.audion-chat-panel`
- `.audion-chat-history` list page width
- `.visually-hidden` for a11y title

## Files

- `apps/web/components/audion-chat-workspace.tsx` (topbar chrome)
- `apps/web/components/audion-chat-panel.tsx`
- `apps/web/app/globals.css` (product hooks only)
- DS: `msqdx-ui/packages/ui/src/css/chat.css` · spec `msqdx-ui-chat-chrome.md`
- Tests: `apps/web/__tests__/chat-panel.test.tsx`

History list still uses TG-style cards (`/chat/history`).
