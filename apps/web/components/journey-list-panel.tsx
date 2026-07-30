import React from 'react'
import Link from 'next/link'
import type { JourneyList } from '@audion-v3/contracts'
import { EmptyState, Panel, Text } from '@msqdx/ui'
import { paths } from '../lib/paths'
import { JourneyCreateButton } from './journey-edit-dialog'
import { GenerateJourneyAiButton } from './ai-workflow-actions'

export function JourneyListPanel({
  list,
  query = '',
}: {
  list: JourneyList
  query?: string
}) {
  return (
    <section className="audion-index audion-tg-index">
      <ul className="audion-tg-grid">
        <li>
          <JourneyCreateButton variant="card" />
        </li>
        <li>
          <GenerateJourneyAiButton variant="card" />
        </li>
        <li>
          <Link href={paths.routes.studies} className="audion-tg-card audion-tg-card--draft">
            <Panel as="div" className="audion-tg-card-panel">
              <Text role="headline" as="h2" className="audion-tg-card-title">
                Convert from UX run
              </Text>
              <p className="audion-tg-card-meta">
                Open Studies → wave run → Convert to journey (UX Journey Agent surface)
              </p>
            </Panel>
          </Link>
        </li>
        {list.items.map((item) => (
          <li key={item.id}>
            <Link
              href={`${paths.routes.journeyDetail(item.id)}${query ? `?q=${encodeURIComponent(query)}` : ''}`}
              className={`audion-tg-card audion-tg-card--${item.status}`}
            >
              <Panel as="div" className="audion-tg-card-panel">
                <Text role="headline" as="h2" className="audion-tg-card-title">
                  {item.name}
                </Text>
                <p className="audion-tg-card-meta">
                  <span>{item.journeyType}</span>
                  <span aria-hidden>·</span>
                  <span>
                    {item.phaseCount} phase{item.phaseCount === 1 ? '' : 's'}
                  </span>
                  {item.targetGroupName ? (
                    <>
                      <span aria-hidden>·</span>
                      <span>{item.targetGroupName}</span>
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

      {!list.items.length ? <EmptyState>No journeys yet.</EmptyState> : null}
    </section>
  )
}
