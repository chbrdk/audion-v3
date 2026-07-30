import React from 'react'
import Link from 'next/link'
import type { JourneyDetail } from '@audion-v3/contracts'
import { EmptyState, Text } from '@msqdx/ui'
import { paths } from '../lib/paths'
import { JourneyDetailActions } from './journey-edit-dialog'
import { JourneyPhaseSlider } from './journey-phase-slider'

function FacetTile({
  label,
  value,
  kind,
}: {
  label: string
  value: React.ReactNode
  kind: string
}) {
  return (
    <li data-kind={kind}>
      <span className="meta">{label}</span>
      {value}
    </li>
  )
}

export function JourneyDetailPanel({ journey }: { journey: JourneyDetail | null }) {
  if (!journey) {
    return (
      <div className="panel briefing-detail audion-magazine audion-magazine--empty">
        <Text role="label" className="briefing-eyebrow">
          Journey
        </Text>
        <EmptyState>
          <Link href={paths.routes.journeys} className="audion-link">
            Back to journeys
          </Link>
          {' — '}
          this map could not be loaded.
        </EmptyState>
      </div>
    )
  }

  return (
    <article className="panel briefing-detail audion-magazine audion-magazine--journey">
      <div className="audion-magazine-topbar ds-motion-reveal">
        <p className="briefing-nav signal-nav">
          <Link href={paths.routes.journeys}>Journeys</Link>
          <span className="briefing-nav-sep" aria-hidden>
            ·
          </span>
          <span data-status={journey.status} className="audion-magazine-status">
            {journey.status}
          </span>
        </p>
        <JourneyDetailActions journey={journey} />
      </div>

      <header className="signal-hero briefing-hero audion-magazine-hero audion-magazine-hero--split ds-motion-reveal">
        <div className="audion-magazine-hero-copy">
          <Text role="label" className="briefing-eyebrow">
            Journey map
          </Text>
          <Text role="headline" as="h2" className="signal-title">
            {journey.name}
          </Text>
          <Text role="body" className="audion-magazine-deck">
            {journey.journeyType}
          </Text>
        </div>
        <ul className="geo-places audion-magazine-facets" aria-label="Journey attributes">
          <FacetTile label="Status" value={journey.status} kind={journey.status} />
          <FacetTile label="Phases" value={String(journey.phaseCount)} kind="phases" />
          {journey.targetGroupId && journey.targetGroupName ? (
            <FacetTile
              label="Target group"
              value={
                <Link
                  href={paths.routes.targetGroupDetail(journey.targetGroupId)}
                  className="audion-facet-link"
                >
                  {journey.targetGroupName}
                </Link>
              }
              kind="target-group"
            />
          ) : null}
        </ul>
      </header>

      {journey.description ? (
        <p className="audion-magazine-lede ds-motion-reveal">{journey.description}</p>
      ) : null}

      <div className="audion-magazine-body audion-journey-body">
        <JourneyPhaseSlider journey={journey} />
      </div>
    </article>
  )
}
