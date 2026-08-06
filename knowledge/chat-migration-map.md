# Chat migration map (AUDION-v2 → v3)

| Legacy | v3 |
|--------|-----|
| `/admin/chat` | `/chat` (app shell) |
| `/admin/chat` Target-group tab (“ask all”) | `/chat?targetGroupId=` + topbar mode **Zielgruppe** — side-by-side round grid (`AudionTargetGroupChatPanel`) |
| `/admin/chat/history` | `/chat/history` |
| `/chat` share (public) | Same path later; MVP may stay auth-gated |
| `MsqdxGlassChatPanel` + MUI | Open editorial surface (`section.audion-chat-panel`) — no DS Panel card; display/body type hierarchy |
| Composer pill / absolute layout | DS `Textarea` + `Button` per `msqdx-ui-chat-chrome.md` |
| Next `/api/chat/*` | `paths.routes.apiChat*` proxies |
| chat-api streaming | Same upstream; normalize to `delta`/`done`/`error` |
| TG fan-out (≤10 parallel streams) | Same client fan-out via `postChatStream`; no TG aggregator API |
| Moodboard / Tavus / Whisper / docs upload | Deferred (persona mode only; disabled in TG) |
| `buildShareChatUrl({ personaId, projectId })` | `paths` helper when share returns |

Specs: `specs/domain/chat-workspace.md` · `chat-fields.md` · `specs/api/chat.md`  
ECHON port source: `msqdx-echon/v3/apps/web-ui/src/chat/` (answer formatter + chrome patterns)  
DS: `msqdx-ui/specs/domain/msqdx-ui-chat-chrome.md` · `packages/ui/src/css/chat.css`  
Implements: `apps/web/components/audion-chat-panel.tsx` · `audion-target-group-chat-panel.tsx` · `apps/web/lib/chat/` · `fixtures/chat-store.ts`  
Paths: `paths.routes.chat` · `chatHistory` · `chatTargetGroup` · `apiChatStream` · `apiChatConversations*`
