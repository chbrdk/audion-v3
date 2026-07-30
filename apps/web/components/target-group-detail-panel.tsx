import React from 'react'
import Link from 'next/link'
import type { TargetGroupDetail } from '@audion-v3/contracts'
import { EmptyState, Text } from '@msqdx/ui'
import { paths } from '../lib/paths'
import { TargetGroupDetailActions } from './target-group-edit-dialog'
import { GeneratePersonasAiButton } from './ai-workflow-actions'
import { ResourceKnowledgeDossier } from './resource-knowledge-dossier'
import { TargetGroupLinkedPersonas } from './target-group-linked-personas'

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

export function TargetGroupDetailPanel({
  targetGroup,
}: {
  targetGroup: TargetGroupDetail | null
}) {
  if (!targetGroup) {
    return (
      <div className="panel briefing-detail audion-magazine audion-magazine--empty">
        <Text role="label" className="briefing-eyebrow">
          Target group
        </Text>
        <EmptyState>
          <Link href={paths.routes.targetGroups} className="audion-link">
            Back to target groups
          </Link>
          {' — '}
          this segment could not be loaded.
        </EmptyState>
      </div>
    )
  }

  return (
    <article className="panel briefing-detail audion-magazine">
      <div className="audion-magazine-topbar ds-motion-reveal">
        <p className="briefing-nav signal-nav">
          <Link href={paths.routes.targetGroups}>Target groups</Link>
          <span className="briefing-nav-sep" aria-hidden>
            ·
          </span>
          <span data-status={targetGroup.status} className="audion-magazine-status">
            {targetGroup.status}
          </span>
        </p>
        <div className="audion-magazine-topbar-actions">
          <TargetGroupDetailActions targetGroup={targetGroup} />
          <GeneratePersonasAiButton
            targetGroupId={targetGroup.id}
            defaultSegment={targetGroup.segment}
            defaultDescription={targetGroup.description}
          />
        </div>
      </div>

      <header className="signal-hero briefing-hero audion-magazine-hero audion-magazine-hero--text ds-motion-reveal">
        <div className="audion-magazine-hero-copy">
          <Text role="label" className="briefing-eyebrow">
            Target group
          </Text>
          <Text role="headline" as="h2" className="signal-title">
            {targetGroup.name}
          </Text>
          <Text role="body" className="audion-magazine-deck">
            {targetGroup.segment}
          </Text>
          <ul className="geo-places audion-magazine-facets" aria-label="Segment attributes">
            <FacetTile label="Status" value={targetGroup.status} kind={targetGroup.status} />
            <FacetTile
              label="Personas"
              value={String(targetGroup.personaCount)}
              kind="personas"
            />
          </ul>
        </div>
      </header>

      {targetGroup.description ? (
        <p className="audion-magazine-lede ds-motion-reveal">{targetGroup.description}</p>
      ) : null}

      <div className="audion-magazine-body">
        <TargetGroupLinkedPersonas personas={targetGroup.linkedPersonas} />
        <ResourceKnowledgeDossier
          title="Knowledge"
          entries={targetGroup.knowledgeEntries}
          documents={targetGroup.documents}
          listUrl={paths.routes.apiTargetGroupKnowledge(targetGroup.id)}
          entryUrl={(entryId) => paths.routes.apiTargetGroupKnowledgeEntry(targetGroup.id, entryId)}
        />
      </div>
    </article>
  )
}
