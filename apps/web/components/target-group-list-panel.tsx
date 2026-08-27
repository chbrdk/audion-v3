'use client'

import React from 'react'
import Link from 'next/link'
import type { TargetGroupList } from '@audion-v3/contracts'
import { EmptyState, Panel, Text } from '@msqdx/ui'
import { paths } from '../lib/paths'
import { useT } from '../lib/user-prefs'
import { TargetGroupCreateButton } from './target-group-edit-dialog'
import { SuggestTargetGroupsAiButton } from './ai-workflow-actions'

export function TargetGroupListPanel({
  list,
  query = '',
}: {
  list: TargetGroupList
  query?: string
}) {
  const t = useT()
  return (
    <section className="audion-index audion-tg-index">
      <ul className="audion-tg-grid">
        <li>
          <TargetGroupCreateButton variant="card" />
        </li>
        <li>
          <SuggestTargetGroupsAiButton variant="card" />
        </li>
        {list.items.map((item) => (
          <li key={item.id}>
            <Link
              href={`${paths.routes.targetGroupDetail(item.id)}${query ? `?q=${encodeURIComponent(query)}` : ''}`}
              className={`audion-tg-card audion-tg-card--${item.status}`}
            >
              <Panel as="div" variant="card" className="audion-tg-card-panel">
                <Text role="headline" as="h2" className="audion-tg-card-title">
                  {item.name}
                </Text>
                <p className="audion-tg-card-meta">
                  <span>{item.segment}</span>
                  <span aria-hidden>·</span>
                  <span>
                    {t(
                      item.personaCount === 1
                        ? 'lists.targetGroups.personaOne'
                        : 'lists.targetGroups.personaMany',
                      { count: item.personaCount },
                    )}
                  </span>
                  <span aria-hidden>·</span>
                  <span data-status={item.status}>{item.status}</span>
                </p>
              </Panel>
            </Link>
          </li>
        ))}
      </ul>

      {!list.items.length ? <EmptyState>{t('lists.targetGroups.empty')}</EmptyState> : null}
    </section>
  )
}
