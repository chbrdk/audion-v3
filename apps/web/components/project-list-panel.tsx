'use client'

import React from 'react'
import Link from 'next/link'
import type { ProjectList } from '@audion-v3/contracts'
import { EmptyState, Panel, Text } from '@msqdx/ui'
import { paths } from '../lib/paths'
import { useT } from '../lib/user-prefs'
import { ProjectCreateButton } from './project-edit-dialog'

export function ProjectListPanel({ list, query = '' }: { list: ProjectList; query?: string }) {
  const t = useT()
  return (
    <section className="audion-index audion-tg-index">
      <ul className="audion-tg-grid">
        <li>
          <ProjectCreateButton variant="card" />
        </li>
        <li>
          <Link href={paths.routes.setup} className="audion-tg-card audion-tg-card--create">
            <Panel as="div" variant="card" className="audion-tg-card-panel audion-tg-card-panel--create">
              <Text role="headline" as="span" className="audion-tg-card-title">
                {t('lists.projects.easySetup')}
              </Text>
              <p className="audion-tg-card-meta">
                <span>{t('lists.projects.easySetupMeta')}</span>
              </p>
            </Panel>
          </Link>
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
                      item.personaCount === 1 ? 'lists.projects.personaOne' : 'lists.projects.personaMany',
                      { count: item.personaCount },
                    )}
                  </span>
                  <span aria-hidden>·</span>
                  <span>
                    {t(
                      item.targetGroupCount === 1 ? 'lists.projects.groupOne' : 'lists.projects.groupMany',
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

      {!list.items.length ? <EmptyState>{t('lists.projects.empty')}</EmptyState> : null}
    </section>
  )
}
