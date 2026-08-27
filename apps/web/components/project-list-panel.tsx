'use client'

import React from 'react'
import Link from 'next/link'
import type { ProjectList } from '@audion-v3/contracts'
import { EmptyState, Panel, Text } from '@msqdx/ui'
import { paths } from '../lib/paths'
import { useT } from '../lib/user-prefs'
import { HubIndexLayoutSwitch, useHubIndexLayout } from './hub-index-layout'
import { ProjectCreateButton } from './project-edit-dialog'

export function ProjectListPanel({ list, query = '' }: { list: ProjectList; query?: string }) {
  const t = useT()
  const { layout, setLayout } = useHubIndexLayout()

  return (
    <section className="audion-index audion-tg-index">
      <header className="audion-hub-index-head audion-hub-index-head--bare">
        <HubIndexLayoutSwitch layout={layout} onChange={setLayout} />
      </header>

      {layout === 'list' ? (
        <div className="audion-hub-index-actions">
          <ProjectCreateButton variant="button" />
        </div>
      ) : null}

      {layout === 'cards' ? (
        <ul className="audion-tg-grid">
          <li>
            <ProjectCreateButton variant="card" />
          </li>
          {list.items.map((item) => (
            <li key={item.id}>
              <Link
                href={`${paths.routes.projectDetail(item.id)}${query ? `?q=${encodeURIComponent(query)}` : ''}`}
                className={`audion-tg-card audion-tg-card--${item.status}`}
              >
                <Panel as="div" variant="card" className="audion-tg-card-panel">
                  <Text role="headline" as="h2" className="audion-tg-card-title">
                    {item.name}
                  </Text>
                  <p className="audion-tg-card-meta">
                    <span>
                      {t(
                        item.personaCount === 1
                          ? 'lists.projects.personaOne'
                          : 'lists.projects.personaMany',
                        { count: item.personaCount },
                      )}
                    </span>
                    <span aria-hidden>·</span>
                    <span>
                      {t(
                        item.targetGroupCount === 1
                          ? 'lists.projects.groupOne'
                          : 'lists.projects.groupMany',
                        { count: item.targetGroupCount },
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
      ) : (
        <ol className="audion-magazine-list audion-hub-index-list" aria-label={t('nav.projects')}>
          {list.items.map((item, index) => (
            <li key={item.id}>
              <span className="audion-magazine-list-num" aria-hidden>
                {String(index + 1).padStart(2, '0')}
              </span>
              <Link
                href={`${paths.routes.projectDetail(item.id)}${query ? `?q=${encodeURIComponent(query)}` : ''}`}
                className="audion-hub-index-list-row"
              >
                <span className="audion-hub-index-list-name">{item.name}</span>
                <span className="audion-hub-index-list-meta">
                  {t(
                    item.personaCount === 1
                      ? 'lists.projects.personaOne'
                      : 'lists.projects.personaMany',
                    { count: item.personaCount },
                  )}
                  <span aria-hidden> · </span>
                  {t(
                    item.targetGroupCount === 1
                      ? 'lists.projects.groupOne'
                      : 'lists.projects.groupMany',
                    { count: item.targetGroupCount },
                  )}
                  <span aria-hidden> · </span>
                  <span data-status={item.status}>{item.status}</span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}

      {!list.items.length ? <EmptyState>{t('lists.projects.empty')}</EmptyState> : null}
    </section>
  )
}
