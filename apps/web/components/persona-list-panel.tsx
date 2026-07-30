import React from 'react'
import Link from 'next/link'
import type { PersonaList } from '@audion-v3/contracts'
import { Button, EmptyState, Field, Input, SectionChrome, Panel, Text } from '@msqdx/ui'
import { paths } from '../lib/paths'
import { PersonaCreateButton } from './persona-actions'
import { GeneratePersonasAiButton } from './ai-workflow-actions'

export function PersonaListPanel({
  list,
  query,
}: {
  list: PersonaList
  query: string
}) {
  return (
    <section className="audion-index audion-tg-index">
      <header className="audion-index-head">
        <SectionChrome quiet title="Personas" meta={`${list.total}`} />
        <form action={paths.routes.personas} className="audion-search">
          <Field label="Filter" className="audion-search__field">
            <Input
              defaultValue={query}
              name="q"
              aria-label="Search personas"
              placeholder="Name, role, archetype…"
            />
          </Field>
          <Button type="submit" size="sm" variant="ghost">
            Apply
          </Button>
        </form>
      </header>

      <ul className="audion-tg-grid">
        <li>
          <PersonaCreateButton variant="card" />
        </li>
        <li>
          <GeneratePersonasAiButton variant="card" />
        </li>
        {list.items.map((item) => (
          <li key={item.id}>
            <Link
              href={`${paths.routes.personaDetail(item.id)}${query ? `?q=${encodeURIComponent(query)}` : ''}`}
              className={`audion-tg-card audion-tg-card--${item.status}`}
            >
              <Panel as="div" className="audion-tg-card-panel">
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
          </li>
        ))}
      </ul>

      {!list.items.length ? <EmptyState>No personas match the current query.</EmptyState> : null}
    </section>
  )
}
