import { AppShell } from '../../../components/app-shell'
import { ChatHistoryPanel } from '../../../components/chat-history-panel'
import { fetchChatConversationList } from '../../../lib/chat/conversations'

/** Avoid SSG hitting Postgres when Coolify injects DATABASE_URL at build time. */
export const dynamic = 'force-dynamic'

export default async function ChatHistoryPage() {
  const list = await fetchChatConversationList()
  return (
    <AppShell>
      <ChatHistoryPanel items={list.items} />
    </AppShell>
  )
}
