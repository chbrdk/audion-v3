'use client'

import React from 'react'
import Link from 'next/link'
import type { PersonaList } from '@audion-v3/contracts'
import { Button, EmptyState, Field, Input, SectionChrome, Panel, Text } from '@msqdx/ui'
import { paths } from '../lib/paths'
import { useT } from '../lib/user-prefs'
import { HubIndexLayoutSwitch, useHubIndexLayout } from './hub-index-layout'
import { HubEntityDeleteButton } from './hub-entity-delete-button'
import { PersonaCreateButton } from './persona-actions'
import { GeneratePersonasAiButton } from './ai-workflow-actions'

export function PersonaListPanel({
  list,
  query,
}: {
  list: PersonaList
  query: string
}) {
  const t = useT()
  const { layout, setLayout } = useHubIndexLayout()
  const actionVariant = layout === 'cards' ? 'card' : 'button'

  return (
    <section className="audion-index audion-tg-index">
      <header className="audion-index-head audion-hub-index-head">
        <SectionChrome quiet title={t('lists.personas.title')} meta={`${list.total}`} />
        <div className="audion-hub-index-tools">
          <form action={paths.routes.personas} className="audion-search">
            <Field label={t('common.filter')} className="audion-search__field">
              <Input
                defaultValue={query}
                name="q"
                aria-label={t('lists.personas.searchAria')}
                placeholder={t('lists.personas.searchPh')}
              />
            </Field>
            <Button type="submit" size="sm" variant="ghost">
              {t('common.apply')}
            </Button>
          </form>
          <HubIndexLayoutSwitch layout={layout} onChange={setLayout} />
        </div>
      </header>

      {layout === 'list' ? (
        <div className="audion-hub-index-actions">
          <PersonaCreateButton variant={actionVariant} />
          <GeneratePersonasAiButton variant={actionVariant} />
        </div>
      ) : null}

      {layout === 'cards' ? (
        <ul className="audion-tg-grid">
          <li>
            <PersonaCreateButton variant="card" />
          </li>
          <li>
            <GeneratePersonasAiButton variant="card" />
          </li>
          {list.items.map((item) => (
            <li key={item.id} className="audion-hub-card-with-action">
              <Link
                href={`${paths.routes.personaDetail(item.id)}${query ? `?q=${encodeURIComponent(query)}` : ''}`}
                className={`audion-tg-card audion-tg-card--${item.status}`}
              >
                <Panel as="div" variant="card" className="audion-tg-card-panel">
                  <Text role="headline" as="h2" className="audion-tg-card-title">
                    {item.name}
                  </Text>
                  <p className="audion-tg-card-meta">
                    <span>{item.role}</span>
                    {item.archetype ? (
                      <>
                        <span aria-hidden>·</span>
                        <span>{item.archetype}</span>
                      </>
                    ) : null}
                    <span aria-hidden>·</span>
                    <span data-status={item.status}>{item.status}</span>
                  </p>
                </Panel>
              </Link>
              <HubEntityDeleteButton
                className="audion-hub-card-delete"
                name={item.name}
                deleteUrl={paths.routes.apiPersonaDetail(item.id)}
                ariaLabel={t('tiles.deletePersona')}
                titleKey="dialogs.deletePersonaTitle"
                bodyKey="dialogs.deletePersonaBody"
              />
            </li>
          ))}
        </ul>
      ) : (
        <ol className="audion-magazine-list audion-hub-index-list" aria-label={t('lists.personas.title')}>
          {list.items.map((item, index) => (
            <li key={item.id}>
              <span className="audion-magazine-list-num" aria-hidden>
                {String(index + 1).padStart(2, '0')}
              </span>
              <div className="audion-hub-index-list-main">
                <Link
                  href={`${paths.routes.personaDetail(item.id)}${query ? `?q=${encodeURIComponent(query)}` : ''}`}
                  className="audion-hub-index-list-row"
                >
                  <span className="audion-hub-index-list-name">{item.name}</span>
                  <span className="audion-hub-index-list-meta">
                    {item.role}
                    {item.archetype ? (
                      <>
                        <span aria-hidden> · </span>
                        {item.archetype}
                      </>
                    ) : null}
                    <span aria-hidden> · </span>
                    <span data-status={item.status}>{item.status}</span>
                  </span>
                </Link>
                <HubEntityDeleteButton
                  name={item.name}
                  deleteUrl={paths.routes.apiPersonaDetail(item.id)}
                  ariaLabel={t('tiles.deletePersona')}
                  titleKey="dialogs.deletePersonaTitle"
                  bodyKey="dialogs.deletePersonaBody"
                />
              </div>
            </li>
          ))}
        </ol>
      )}

      {!list.items.length ? <EmptyState>{t('lists.personas.empty')}</EmptyState> : null}
    </section>
  )
}
