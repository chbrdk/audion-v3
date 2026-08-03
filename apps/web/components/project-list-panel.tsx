import React from 'react'
import Link from 'next/link'
import type { ProjectList } from '@audion-v3/contracts'
import { EmptyState, Panel, Text } from '@msqdx/ui'
import { paths } from '../lib/paths'
import { ProjectCreateButton } from './project-edit-dialog'

export function ProjectListPanel({ list, query = '' }: { list: ProjectList; query?: string }) {
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
                Easy setup
              </Text>
              <p className="audion-tg-card-meta">
                <span>Project + group + persona</span>
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
                    {item.personaCount} persona{item.personaCount === 1 ? '' : 's'}
                  </span>
                  <span aria-hidden>·</span>
                  <span>
                    {item.targetGroupCount} group{item.targetGroupCount === 1 ? '' : 's'}
                  </span>
                  <span aria-hidden>·</span>
                  <span data-status={item.status}>{item.status}</span>
                </p>
              </Panel>
            </Link>
          </li>
        ))}
      </ul>

      {!list.items.length ? <EmptyState>No projects yet.</EmptyState> : null}
    </section>
  )
}
