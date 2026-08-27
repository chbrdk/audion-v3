import { AppShell } from '../../../components/app-shell'
import { ChatHistoryPanel } from '../../../components/chat-history-panel'
import { HubTopStatus } from '../../../components/hub-top-status'
import { fetchChatConversationList } from '../../../lib/chat/conversations'

/** Avoid SSG hitting Postgres when Coolify injects DATABASE_URL at build time. */
export const dynamic = 'force-dynamic'

export default async function ChatHistoryPage() {
  const list = await fetchChatConversationList()
  return (
    <AppShell
      titleKey="pages.chatHistory.title"
      status={<HubTopStatus total={list.total} entity="conversations" />}
    >
      <ChatHistoryPanel items={list.items} />
    </AppShell>
  )
}
