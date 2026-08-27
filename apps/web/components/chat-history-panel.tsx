'use client'

import React from 'react'
import Link from 'next/link'
import { EmptyState, Panel, Text } from '@msqdx/ui'
import { paths } from '../lib/paths'
import { useT } from '../lib/user-prefs'

type HistoryItem = {
  id: string
  personaId: string
  title: string | null
  personaName: string | null
  preview: string | null
}

export function ChatHistoryPanel({ items }: { items: HistoryItem[] }) {
  const t = useT()
  return (
    <section className="audion-chat-history">
      <p className="audion-page-lead">
        <Link href={paths.routes.chat} className="audion-link">
          {t('pages.chatHistory.newChat')}
        </Link>
      </p>
      {items.length ? (
        <ul className="audion-tg-grid">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={`${paths.routes.chat}?personaId=${encodeURIComponent(item.personaId)}&conversationId=${encodeURIComponent(item.id)}`}
                className="audion-tg-card"
              >
                <Panel as="div" className="audion-tg-card-panel">
                  <Text role="headline" as="h2" className="audion-tg-card-title">
                    {item.title || item.personaName || t('pages.chatHistory.conversation')}
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
        <EmptyState>{t('pages.chatHistory.empty')}</EmptyState>
      )}
    </section>
  )
}
