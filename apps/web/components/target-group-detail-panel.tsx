'use client'

import React from 'react'
import Link from 'next/link'
import type { TargetGroupDetail } from '@audion-v3/contracts'
import { EmptyState, Text } from '@msqdx/ui'
import { paths } from '../lib/paths'
import { useT } from '../lib/user-prefs'
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

export type TargetGroupProjectRef = {
  id: string
  name: string
}

export function TargetGroupDetailPanel({
  targetGroup,
  project = null,
}: {
  targetGroup: TargetGroupDetail | null
  /** Resolved Collection / project for the hero facet (server-loaded). */
  project?: TargetGroupProjectRef | null
}) {
  const t = useT()

  if (!targetGroup) {
    return (
      <div className="panel briefing-detail audion-magazine audion-magazine--empty">
        <Text role="label" className="briefing-eyebrow">
          {t('detail.targetGroup.eyebrow')}
        </Text>
        <EmptyState>{t('detail.targetGroup.missing')}</EmptyState>
      </div>
    )
  }

  const projectLink = project ? (
    <Link href={paths.routes.projectDetail(project.id)} className="audion-link">
      {project.name}
    </Link>
  ) : targetGroup.projectId ? (
    <Link href={paths.routes.projectDetail(targetGroup.projectId)} className="audion-link">
      {t('dialogs.fieldProject')}
    </Link>
  ) : (
    t('detail.targetGroup.noProject')
  )

  return (
    <article className="panel briefing-detail audion-magazine">
      <div className="audion-magazine-topbar ds-motion-reveal">
        <p className="briefing-nav signal-nav">
          <Link href={paths.routes.targetGroups}>{t('nav.targetGroups')}</Link>
          <span className="briefing-nav-sep" aria-hidden>
            ·
          </span>
          <span data-status={targetGroup.status} className="audion-magazine-status">
            {targetGroup.status}
          </span>
        </p>
        <div className="audion-magazine-topbar-actions">
          {targetGroup.linkedPersonas.length > 0 ? (
            <Link
              href={paths.routes.chatTargetGroup(targetGroup.id)}
              className="audion-link audion-magazine-ask-all"
            >
              {t('detail.targetGroup.askAll')}
            </Link>
          ) : null}
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
            {t('detail.targetGroup.eyebrow')}
          </Text>
          <Text role="headline" as="h2" className="signal-title">
            {targetGroup.name}
          </Text>
          <Text role="body" className="audion-magazine-deck">
            {targetGroup.segment}
          </Text>
          <ul className="geo-places audion-magazine-facets" aria-label="Segment attributes">
            <FacetTile
              label={t('detail.persona.status')}
              value={targetGroup.status}
              kind={targetGroup.status}
            />
            <FacetTile
              label={t('detail.project.personas')}
              value={String(targetGroup.personaCount)}
              kind="personas"
            />
            <FacetTile label={t('dialogs.fieldProject')} kind="project" value={projectLink} />
          </ul>
        <div className="audion-magazine-hero-actions">
          <TargetGroupDetailActions targetGroup={targetGroup} />
        </div>
        </div>
      </header>

      {targetGroup.description ? (
        <p className="audion-magazine-lede ds-motion-reveal">{targetGroup.description}</p>
      ) : null}

      <div className="audion-magazine-body">
        <TargetGroupLinkedPersonas
          personas={targetGroup.linkedPersonas}
          targetGroupId={targetGroup.id}
          projectId={targetGroup.projectId}
        />
        <ResourceKnowledgeDossier
          title={t('detail.targetGroup.knowledge')}
          entries={targetGroup.knowledgeEntries}
          documents={targetGroup.documents}
          listUrl={paths.routes.apiTargetGroupKnowledge(targetGroup.id)}
          uploadUrl={paths.routes.apiTargetGroupKnowledgeUpload(targetGroup.id)}
          projectId={targetGroup.projectId}
          entrySourceRef={(entryId) => `tg:${targetGroup.id}:${entryId}`}
        />
      </div>
    </article>
  )
}
