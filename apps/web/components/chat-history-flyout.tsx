'use client'

import React, { useEffect, useState } from 'react'
import type { ChatConversationList, ChatConversationSummary } from '@audion-v3/contracts'
import { EmptyState, SectionChrome } from '@msqdx/ui'
import { paths } from '../lib/paths'
import { ChatFlyout } from './chat-flyout'
import { IconHistory } from './nav-icons'

export function ChatHistoryFlyout({
  personaId,
}: {
  /** Prefer listing conversations for the active persona first. */
  personaId?: string | null
}) {
  const [items, setItems] = useState<ChatConversationSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(paths.routes.apiChatConversations)
        if (!res.ok) throw new Error(`History failed (${res.status})`)
        const data = (await res.json()) as ChatConversationList
        if (cancelled) return
        const all = data.items ?? []
        const preferred = personaId
          ? [
              ...all.filter((c) => c.personaId === personaId),
              ...all.filter((c) => c.personaId !== personaId),
            ]
          : all
        setItems(preferred.slice(0, 8))
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load history')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [personaId])

  return (
    <ChatFlyout
      label="History"
      icon={<IconHistory />}
      resetKey={personaId}
      panelClassName="audion-chat-history-flyover"
    >
      {() => (
        <>
          <SectionChrome quiet title="History" meta={items.length ? `${items.length}` : undefined} as="h3" />
          {loading ? <p className="audion-edit-lede">Loading…</p> : null}
          {error ? <p className="audion-edit-error">{error}</p> : null}
          {!loading && !error && !items.length ? (
            <EmptyState className="audion-chat-history-empty">No conversations yet.</EmptyState>
          ) : null}
          {items.length ? (
            <ul className="audion-chat-history-flyout-list">
              {items.map((item) => (
                <li key={item.id}>
                  <a
                    className="audion-chat-history-flyout-item"
                    href={paths.routes.chatConversation({
                      conversationId: item.id,
                      personaId: item.personaId,
                    })}
                  >
                    <span className="audion-chat-history-flyout-title">
                      {item.title || item.preview || 'Conversation'}
                    </span>
                    <span className="audion-chat-history-flyout-meta">
                      {item.personaName || 'Persona'}
                      {item.updatedAt
                        ? ` · ${new Date(item.updatedAt).toLocaleDateString()}`
                        : ''}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
          <p className="audion-chat-flyover-footer">
            <a className="audion-link" href={paths.routes.chatHistory}>
              Open full history
            </a>
          </p>
        </>
      )}
    </ChatFlyout>
  )
}
