import Link from 'next/link'
import { EmptyState, Panel, Text, TopStatus } from '@msqdx/ui'
import { AppShell } from '../../../components/app-shell'
import { fetchChatConversationList } from '../../../lib/chat/conversations'
import { paths } from '../../../lib/paths'

export default async function ChatHistoryPage() {
  const list = await fetchChatConversationList()
  return (
    <AppShell
      title="Chat history"
      status={
        <TopStatus level="ok" primary={`${list.total} conversations`} secondary="fixtures" />
      }
    >
      <section className="audion-chat-history">
        <p className="audion-page-lead">
          <Link href={paths.routes.chat} className="audion-link">
            New chat
          </Link>
        </p>
        {list.items.length ? (
          <ul className="audion-tg-grid">
            {list.items.map((item) => (
              <li key={item.id}>
                <Link
                  href={`${paths.routes.chat}?personaId=${encodeURIComponent(item.personaId)}&conversationId=${encodeURIComponent(item.id)}`}
                  className="audion-tg-card"
                >
                  <Panel as="div" className="audion-tg-card-panel">
                    <Text role="headline" as="h2" className="audion-tg-card-title">
                      {item.title || item.personaName || 'Conversation'}
                    </Text>
                    <p className="audion-tg-card-meta">
                      <span>{item.personaName || item.personaId}</span>
                      {item.preview ? (
                        <>
                          <span aria-hidden>·</span>
                          <span>{item.preview}</span>
                        </>
                      ) : null}
                    </p>
                  </Panel>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState>No conversations yet.</EmptyState>
        )}
      </section>
    </AppShell>
  )
}
