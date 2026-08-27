'use client'

import React from 'react'
import Link from 'next/link'
import type { UxStudyList } from '@audion-v3/contracts'
import { EmptyState, Panel, Text, Button } from '@msqdx/ui'
import { paths } from '../lib/paths'
import { useT } from '../lib/user-prefs'
import { StudyCreateButton } from './study-edit-dialog'

export function StudyListPanel({
  list,
  query = '',
}: {
  list: UxStudyList
  query?: string
}) {
  const t = useT()
  return (
    <section className="audion-index audion-tg-index">
      <div className="msqdx-flow-studies-actions">
        <Link href={paths.routes.studiesFlows}>
          <Button type="button" size="sm" variant="subtle">
            {t('lists.studies.flowsCta')}
          </Button>
        </Link>
      </div>
      <ul className="audion-tg-grid">
        <li>
          <StudyCreateButton variant="card" />
        </li>
        {list.items.map((item) => (
          <li key={item.id}>
            <Link
              href={`${paths.routes.studyDetail(item.id)}${query ? `?q=${encodeURIComponent(query)}` : ''}`}
              className={`audion-tg-card audion-tg-card--${item.status}`}
            >
              <Panel as="div" variant="card" className="audion-tg-card-panel">
                <Text role="headline" as="h2" className="audion-tg-card-title">
                  {item.name}
                </Text>
                <p className="audion-tg-card-meta">
                  <span>
                    {t(
                      item.waveCount === 1 ? 'lists.studies.waveOne' : 'lists.studies.waveMany',
                      { count: item.waveCount },
                    )}
                  </span>
                  {item.targetUrlKey ? (
                    <>
                      <span aria-hidden>·</span>
                      <span>{item.targetUrlKey}</span>
                    </>
                  ) : null}
                  <span aria-hidden>·</span>
                  <span data-status={item.status}>{item.status}</span>
                </p>
              </Panel>
            </Link>
          </li>
        ))}
      </ul>
      {!list.items.length ? <EmptyState>{t('lists.studies.empty')}</EmptyState> : null}
    </section>
  )
}
