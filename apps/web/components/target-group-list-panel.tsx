'use client'

import React from 'react'
import Link from 'next/link'
import type { TargetGroupList } from '@audion-v3/contracts'
import { EmptyState, Panel, Text } from '@msqdx/ui'
import { paths } from '../lib/paths'
import { useT } from '../lib/user-prefs'
import { HubIndexLayoutSwitch, useHubIndexLayout } from './hub-index-layout'
import { HubEntityDeleteButton } from './hub-entity-delete-button'
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
  const { layout, setLayout } = useHubIndexLayout()
  const actionVariant = layout === 'cards' ? 'card' : 'button'

  return (
    <section className="audion-index audion-tg-index">
      <header className="audion-hub-index-head audion-hub-index-head--bare">
        <HubIndexLayoutSwitch layout={layout} onChange={setLayout} />
      </header>

      {layout === 'list' ? (
        <div className="audion-hub-index-actions">
          <TargetGroupCreateButton variant={actionVariant} />
          <SuggestTargetGroupsAiButton variant={actionVariant} />
        </div>
      ) : null}

      {layout === 'cards' ? (
        <ul className="audion-tg-grid">
          <li>
            <TargetGroupCreateButton variant="card" />
          </li>
          <li>
            <SuggestTargetGroupsAiButton variant="card" />
          </li>
          {list.items.map((item) => (
            <li key={item.id} className="audion-hub-card-with-action">
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
              <HubEntityDeleteButton
                className="audion-hub-card-delete"
                name={item.name}
                deleteUrl={paths.routes.apiTargetGroupDetail(item.id)}
                ariaLabel={t('tiles.deleteTargetGroup')}
                titleKey="dialogs.deleteTargetGroupTitle"
                bodyKey="dialogs.deleteTargetGroupBody"
              />
            </li>
          ))}
        </ul>
      ) : (
        <ol className="audion-magazine-list audion-hub-index-list" aria-label={t('nav.targetGroups')}>
          {list.items.map((item, index) => (
            <li key={item.id}>
              <span className="audion-magazine-list-num" aria-hidden>
                {String(index + 1).padStart(2, '0')}
              </span>
              <div className="audion-hub-index-list-main">
                <Link
                  href={`${paths.routes.targetGroupDetail(item.id)}${query ? `?q=${encodeURIComponent(query)}` : ''}`}
                  className="audion-hub-index-list-row"
                >
                  <span className="audion-hub-index-list-name">{item.name}</span>
                  <span className="audion-hub-index-list-meta">
                    {item.segment}
                    <span aria-hidden> · </span>
                    {t(
                      item.personaCount === 1
                        ? 'lists.targetGroups.personaOne'
                        : 'lists.targetGroups.personaMany',
                      { count: item.personaCount },
                    )}
                    <span aria-hidden> · </span>
                    <span data-status={item.status}>{item.status}</span>
                  </span>
                </Link>
                <HubEntityDeleteButton
                  name={item.name}
                  deleteUrl={paths.routes.apiTargetGroupDetail(item.id)}
                  ariaLabel={t('tiles.deleteTargetGroup')}
                  titleKey="dialogs.deleteTargetGroupTitle"
                  bodyKey="dialogs.deleteTargetGroupBody"
                />
              </div>
            </li>
          ))}
        </ol>
      )}

      {!list.items.length ? <EmptyState>{t('lists.targetGroups.empty')}</EmptyState> : null}
    </section>
  )
}
