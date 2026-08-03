'use client'

import React from 'react'
import Link from 'next/link'
import type { UxStudyDetail } from '@audion-v3/contracts'
import { EmptyState, Hint, Panel, RankedList, RankedRow, SectionChrome, Text } from '@msqdx/ui'
import { paths } from '../lib/paths'
import { WaveCreateButton } from './wave-edit-dialog'

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

export function StudyDetailPanel({ study }: { study: UxStudyDetail | null }) {
  if (!study) {
    return (
      <div className="panel briefing-detail audion-magazine audion-magazine--empty">
        <Text role="label" className="briefing-eyebrow">
          UX Study
        </Text>
        <EmptyState>
          <Link href={paths.routes.studies} className="audion-link">
            Back to studies
          </Link>
          {' — '}
          this study could not be loaded.
        </EmptyState>
      </div>
    )
  }

  return (
    <article className="panel briefing-detail audion-magazine audion-magazine--study">
      <div className="audion-magazine-topbar ds-motion-reveal">
        <p className="briefing-nav signal-nav">
          <Link href={paths.routes.studies}>UX Studies</Link>
          <span className="briefing-nav-sep" aria-hidden>
            ·
          </span>
          <span data-status={study.status} className="audion-magazine-status">
            {study.status}
          </span>
        </p>
        <div className="audion-magazine-topbar-actions">
          <WaveCreateButton studyId={study.id} defaultTargetUrlKey={study.targetUrlKey} />
        </div>
      </div>

      <header className="signal-hero briefing-hero audion-magazine-hero audion-magazine-hero--split ds-motion-reveal">
        <div className="audion-magazine-hero-copy">
          <Text role="label" className="briefing-eyebrow">
            UX Study
          </Text>
          <Text role="headline" as="h2" className="signal-title">
            {study.name}
          </Text>
          <Text role="body" className="audion-magazine-deck">
            {study.sourceGuide || 'Study → Wave → Evaluate → Compare'}
          </Text>
        </div>
        <ul className="geo-places audion-magazine-facets" aria-label="Study attributes">
          <FacetTile label="Status" value={study.status} kind={study.status} />
          <FacetTile label="Waves" value={String(study.waveCount)} kind="waves" />
          {study.targetUrlKey ? (
            <FacetTile label="URL key" value={study.targetUrlKey} kind="url" />
          ) : null}
        </ul>
      </header>

      {study.description ? (
        <p className="audion-magazine-lede ds-motion-reveal">{study.description}</p>
      ) : null}

      <div className="audion-magazine-body audion-study-body">
        <Panel
          className="detail-block audion-magazine-band audion-study-section ds-motion-reveal"
          aria-label="Hypotheses"
        >
          <SectionChrome
            quiet
            role="signals"
            title="Hypotheses"
            meta={`${study.hypothesisTemplates.length} templates`}
            metaTone="accent"
            as="h3"
          />
          <Hint panel>
            Soft verdicts are applied per wave after evaluate — validEvidence-only.
          </Hint>
          {study.hypothesisTemplates.length ? (
            <RankedList>
              {study.hypothesisTemplates.map((h, i) => (
                <RankedRow
                  key={h.id}
                  index={i + 1}
                  label={
                    <>
                      <span className="audion-study-hyp-id">{h.id}</span> {h.statement}
                    </>
                  }
                />
              ))}
            </RankedList>
          ) : (
            <EmptyState>No hypothesis templates yet.</EmptyState>
          )}
        </Panel>

        <Panel
          className="detail-block audion-magazine-band audion-study-section ds-motion-reveal"
          aria-label="Waves"
        >
          <SectionChrome
            quiet
            role="waves"
            title="Waves"
            meta={`${study.waves.length} total`}
            metaTone="accent"
            as="h3"
            action={
              <WaveCreateButton studyId={study.id} defaultTargetUrlKey={study.targetUrlKey} />
            }
          />
          {study.waves.length ? (
            <ul className="audion-tg-grid audion-tg-grid--nested">
              {study.waves.map((wave) => (
                <li key={wave.id}>
                  <Link
                    href={paths.routes.studyWaveDetail(study.id, wave.id)}
                    className={`audion-tg-card audion-tg-card--${wave.status}`}
                  >
                    <Panel as="div" variant="card" className="audion-tg-card-panel">
                      <Text role="headline" as="h3" className="audion-tg-card-title">
                        {wave.waveKey}
                      </Text>
                      <p className="audion-tg-card-meta">
                        <span data-status={wave.status}>{wave.status}</span>
                        <span aria-hidden>·</span>
                        <span>
                          {wave.runCount} runs · {wave.validEvidenceCount} valid
                        </span>
                      </p>
                    </Panel>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState>No waves yet — create one to seed a run plan.</EmptyState>
          )}
        </Panel>
      </div>
    </article>
  )
}
