'use client'

import React, { useEffect, useState } from 'react'
import type { ChatConversationList, ChatConversationSummary } from '@audion-v3/contracts'
import { EmptyState, Flyout, IconHistory, SectionChrome } from '@msqdx/ui'
import { paths } from '../lib/paths'
import { useT } from '../lib/user-prefs'

export function ChatHistoryFlyout({
  personaId,
}: {
  /** Prefer listing conversations for the active persona first. */
  personaId?: string | null
}) {
  const t = useT()
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
        if (!cancelled) setError(e instanceof Error ? e.message : t('chat.historyLoadFailed'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [personaId, t])

  return (
    <Flyout
      label={t('chat.history')}
      icon={<IconHistory />}
      resetKey={personaId}
      triggerClassName="audion-chat-topbar-icon"
      panelClassName="audion-chat-history-flyover"
    >
      {() => (
        <>
          <SectionChrome quiet title={t('chat.history')} meta={items.length ? `${items.length}` : undefined} as="h3" />
          {loading ? <p className="audion-edit-lede">{t('common.loading')}</p> : null}
          {error ? <p className="audion-edit-error">{error}</p> : null}
          {!loading && !error && !items.length ? (
            <EmptyState className="audion-chat-history-empty">{t('chat.historyEmpty')}</EmptyState>
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
                      {item.title || item.preview || t('chat.historyConversation')}
                    </span>
                    <span className="audion-chat-history-flyout-meta">
                      {item.personaName || t('chat.fieldPersona')}
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
              {t('chat.historyOpenFull')}
            </a>
          </p>
        </>
      )}
    </Flyout>
  )
}
