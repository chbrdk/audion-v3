'use client'

import React from 'react'
import Link from 'next/link'
import type { ProjectList } from '@audion-v3/contracts'
import {
  Button,
  CardActions,
  CollectionHubCard,
  CollectionHubMetric,
  EmptyState,
} from '../lib/msqdx-ui'
import { paths } from '../lib/paths'
import { useT } from '../lib/user-prefs'
import { HubIndexLayoutSwitch, useHubIndexLayout } from './hub-index-layout'
import { ProjectCreateButton } from './project-edit-dialog'
import { NavIconPersonas, NavIconTargetGroups } from './nav-icons'

export function ProjectListPanel({ list, query = '' }: { list: ProjectList; query?: string }) {
  const t = useT()
  const { layout, setLayout } = useHubIndexLayout()

  function detailHref(id: string) {
    return `${paths.routes.projectDetail(id)}${query ? `?q=${encodeURIComponent(query)}` : ''}`
  }

  return (
    <section className="audion-index audion-tg-index" data-section="projects-hub">
      <header className="audion-hub-index-head audion-hub-index-head--bare">
        <HubIndexLayoutSwitch layout={layout} onChange={setLayout} />
      </header>

      {layout === 'cards' ? (
        <div className="ds-collection-hub-grid" aria-label={t('nav.projects')}>
          <ProjectCreateButton variant="card" />
          {list.items.map((item) => (
            <CollectionHubCard
              key={item.id}
              className={`audion-project-hub-card audion-project-hub-card--${item.status}`}
              kicker={item.status}
              title={item.name}
              stats={
                <>
                  <CollectionHubMetric
                    icon={<NavIconPersonas />}
                    value={String(item.personaCount)}
                    label={t('nav.personas')}
                  />
                  <CollectionHubMetric
                    icon={<NavIconTargetGroups />}
                    value={String(item.targetGroupCount)}
                    label={t('nav.targetGroups')}
                  />
                </>
              }
              actions={
                <CardActions>
                  <Link href={detailHref(item.id)}>
                    <Button variant="ghost">{t('common.open')}</Button>
                  </Link>
                </CardActions>
              }
            />
          ))}
        </div>
      ) : (
        <div className="audion-projects-list-wrap">
          <div className="audion-hub-index-actions">
            <ProjectCreateButton variant="button" />
          </div>
          {list.items.length > 0 ? (
            <ol className="ds-collection-hub-list" aria-label={t('nav.projects')}>
              {list.items.map((item, index) => (
                <li key={item.id} className="ds-collection-hub-list-row">
                  <span className="ds-collection-hub-list-num" aria-hidden>
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div className="ds-collection-hub-list-row__main">
                    <Link href={detailHref(item.id)} className="ds-collection-hub-list-row__title">
                      {item.name}
                    </Link>
                    <p className="ds-collection-hub-list-meta">
                      <span data-status={item.status}>{item.status}</span>
                      <span aria-hidden> · </span>
                      {t(
                        item.targetGroupCount === 1
                          ? 'lists.projects.groupOne'
                          : 'lists.projects.groupMany',
                        { count: item.targetGroupCount },
                      )}
                      <span aria-hidden> · </span>
                      {t(
                        item.personaCount === 1
                          ? 'lists.projects.personaOne'
                          : 'lists.projects.personaMany',
                        { count: item.personaCount },
                      )}
                    </p>
                  </div>
                  <div className="ds-collection-hub-list-row__trail">
                    <Link href={detailHref(item.id)}>
                      <Button variant="ghost" size="sm">
                        {t('common.open')}
                      </Button>
                    </Link>
                  </div>
                </li>
              ))}
            </ol>
          ) : null}
        </div>
      )}

      {!list.items.length ? <EmptyState>{t('lists.projects.empty')}</EmptyState> : null}
    </section>
  )
}
