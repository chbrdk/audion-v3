'use client'

import React from 'react'
import type {
  ProjectDetail,
  PersonaSummary,
  TargetGroupSummary,
} from '@audion-v3/contracts'
import { EmptyState, Text } from '@msqdx/ui'
import { useT } from '../lib/user-prefs'
import {
  ProjectPersonaList,
  ProjectTargetGroupList,
  ProjectTeamList,
} from './project-compact-lists'
import { ProjectDetailActions } from './project-edit-dialog'
import { ProjectKnowledgeDossier } from './project-knowledge-dossier'
import { ProjectAiActions } from './ai-workflow-actions'

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

export function ProjectDetailPanel({
  project,
  personas = [],
  targetGroups = [],
}: {
  project: ProjectDetail | null
  personas?: PersonaSummary[]
  targetGroups?: TargetGroupSummary[]
}) {
  const t = useT()

  if (!project) {
    return (
      <div className="panel briefing-detail audion-magazine audion-magazine--empty">
        <Text role="label" className="briefing-eyebrow">
          {t('detail.project.eyebrow')}
        </Text>
        <EmptyState>{t('detail.project.missing')}</EmptyState>
      </div>
    )
  }

  const members = project.members.filter((m) => m.status !== 'removed')

  return (
    <article className="panel briefing-detail audion-magazine">
      <header className="signal-hero briefing-hero audion-magazine-hero audion-magazine-hero--text ds-motion-reveal">
        <div className="audion-magazine-hero-copy">
          <Text role="label" className="briefing-eyebrow">
            {t('detail.project.eyebrow')}
          </Text>
          <Text role="headline" as="h2" className="signal-title">
            {project.name}
          </Text>
          {project.nameDe ? (
            <Text role="body" className="audion-magazine-deck">
              {project.nameDe}
            </Text>
          ) : null}
          <ul className="geo-places audion-magazine-facets" aria-label="Project attributes">
            <FacetTile
              label={t('detail.persona.status')}
              value={project.status}
              kind={project.status}
            />
            <FacetTile
              label={t('detail.project.personas')}
              value={String(personas.length)}
              kind="personas"
            />
            <FacetTile
              label={t('detail.project.targetGroups')}
              value={String(targetGroups.length)}
              kind="groups"
            />
            <FacetTile
              label={t('detail.project.team')}
              value={String(project.memberCount)}
              kind="team"
            />
          </ul>
        <div className="audion-magazine-hero-actions">
          <ProjectDetailActions project={project} />
        </div>
        </div>
      </header>

      <div className="audion-project-intro ds-motion-reveal">
        <div className="audion-project-intro-copy">
          {project.description ? (
            <p className="audion-magazine-lede audion-project-intro-lede">{project.description}</p>
          ) : (
            <EmptyState>{t('detail.project.emptyDesc')}</EmptyState>
          )}
        </div>
        <aside className="audion-project-intro-team">
          <ProjectTeamList projectId={project.id} members={members} />
        </aside>
      </div>

      <div className="audion-magazine-body">
        <div className="audion-ai-actions-band ds-motion-reveal">
          <ProjectAiActions
            projectId={project.id}
            targetGroups={targetGroups.map((g) => ({
              id: g.id,
              name: g.name,
              segment: g.segment,
            }))}
          />
        </div>
        <div className="audion-project-split ds-motion-reveal">
          <section className="audion-project-split-col">
            <ProjectTargetGroupList projectId={project.id} targetGroups={targetGroups} />
          </section>
          <section className="audion-project-split-col">
            <ProjectPersonaList projectId={project.id} personas={personas} />
          </section>
        </div>

        <ProjectKnowledgeDossier
          projectId={project.id}
          companyContext={project.companyContext}
          knowledgeChapters={project.knowledgeChapters}
          platformProjectId={project.platformProjectId}
        />
      </div>
    </article>
  )
}
