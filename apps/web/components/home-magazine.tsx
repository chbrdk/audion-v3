'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import type {
  JourneySummary,
  PersonaSummary,
  ProjectSummary,
  TargetGroupSummary,
} from '@audion-v3/contracts'
import { Button, EmptyState, Text } from '@msqdx/ui'
import { paths } from '../lib/paths'
import { useT } from '../lib/user-prefs'

type DatedName = { id: string; name: string; updatedAt: string | null }

function byUpdatedAtDescThenName(a: DatedName, b: DatedName): number {
  const ta = a.updatedAt ? Date.parse(a.updatedAt) : 0
  const tb = b.updatedAt ? Date.parse(b.updatedAt) : 0
  if (tb !== ta) return tb - ta
  return a.name.localeCompare(b.name)
}

export function buildHomeRecentPersonas(
  personas: PersonaSummary[],
  limit = 8,
): PersonaSummary[] {
  return [...personas].sort(byUpdatedAtDescThenName).slice(0, limit)
}

export function buildHomeRecentProjects(
  projects: ProjectSummary[],
  limit = 8,
): ProjectSummary[] {
  return [...projects].sort(byUpdatedAtDescThenName).slice(0, limit)
}

export function buildHomeRecentTargetGroups(
  groups: TargetGroupSummary[],
  limit = 8,
): TargetGroupSummary[] {
  return [...groups].sort(byUpdatedAtDescThenName).slice(0, limit)
}

export function buildHomeRecentJourneys(
  journeys: JourneySummary[],
  limit = 5,
): JourneySummary[] {
  return [...journeys].sort(byUpdatedAtDescThenName).slice(0, limit)
}

function HomeChapter({
  eyebrow,
  title,
  deck,
  meta,
  children,
}: {
  eyebrow: string
  title: string
  deck?: string
  meta?: string
  children: ReactNode
}) {
  return (
    <section className="audion-home-chapter">
      <header className="audion-home-chapter__head">
        <div>
          <p className="audion-home-eyebrow">{eyebrow}</p>
          <h2 className="audion-home-headline">{title}</h2>
          {deck ? <p className="audion-home-chapter__deck">{deck}</p> : null}
        </div>
        {meta ? (
          <Text role="meta" as="p">
            {meta}
          </Text>
        ) : null}
      </header>
      {children}
    </section>
  )
}

function RecentColumn({
  title,
  ariaLabel,
  empty,
  children,
}: {
  title: string
  ariaLabel: string
  empty?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="audion-home-recent-col" aria-label={ariaLabel}>
      <h3 className="audion-home-recent-col__title">{title}</h3>
      {empty != null ? (
        empty
      ) : (
        <ol className="audion-magazine-list audion-home-recent-list">{children}</ol>
      )}
    </div>
  )
}

function HomeJourneyCard({ journey }: { journey: JourneySummary }) {
  const t = useT()
  return (
    <article className="audion-home-journey-card">
      <Text role="meta" as="p" className="audion-home-journey-card__kicker">
        {journey.journeyType || '\u00a0'}
      </Text>
      <Text role="headline" as="h3" className="audion-home-journey-card__title">
        {journey.name}
      </Text>
      <p className="audion-home-journey-card__meta">
        <span data-status={journey.status}>{journey.status}</span>
        <span aria-hidden>·</span>
        <span>
          {t(
            journey.phaseCount === 1 ? 'home.phaseOne' : 'home.phaseMany',
            { count: journey.phaseCount },
          )}
        </span>
      </p>
      <div className="audion-home-journey-card__actions">
        <Link href={paths.routes.journeyDetail(journey.id)}>
          <Button variant="ghost">{t('common.open')}</Button>
        </Link>
      </div>
    </article>
  )
}

export function HomeMagazine({
  personas,
  projects,
  targetGroups,
  journeys,
}: {
  personas: PersonaSummary[]
  projects: ProjectSummary[]
  targetGroups: TargetGroupSummary[]
  journeys: JourneySummary[]
}) {
  const t = useT()
  const recentPersonas = buildHomeRecentPersonas(personas, 8)
  const recentProjects = buildHomeRecentProjects(projects, 8)
  const recentGroups = buildHomeRecentTargetGroups(targetGroups, 8)
  const recentJourneys = buildHomeRecentJourneys(journeys, 5)

  return (
    <article
      className="audion-magazine audion-magazine--home"
      data-section="home-magazine"
    >
      <header className="audion-home-cover">
        <p className="audion-home-cover__kicker">{t('home.kicker')}</p>
        <h1 className="audion-home-cover__title">{t('home.title')}</h1>
        <p className="audion-home-cover__lede">{t('home.lede')}</p>
        <div className="audion-home-cover__actions">
          <Link href={paths.routes.chat}>
            <Button>{t('home.chatCta')}</Button>
          </Link>
          <Link href={paths.routes.projects}>
            <Button variant="ghost">{t('nav.projects')}</Button>
          </Link>
        </div>
      </header>

      <HomeChapter
        eyebrow={t('home.topicsEyebrow')}
        title={t('home.topicsTitle')}
        deck={t('home.topicsDeck')}
      >
        <div className="audion-home-cta-row" role="group" aria-label={t('home.topicsAria')}>
          <Link href={paths.routes.personas} className="audion-capability-tile audion-home-cta">
            <span className="audion-capability-tile__kicker">{t('home.personasKicker')}</span>
            <span className="audion-capability-tile__label">{t('home.personasLabel')}</span>
            <span className="audion-capability-tile__deck">{t('home.personasDeck')}</span>
          </Link>
          <Link href={paths.routes.projects} className="audion-capability-tile audion-home-cta">
            <span className="audion-capability-tile__kicker">{t('home.projectsKicker')}</span>
            <span className="audion-capability-tile__label">{t('home.projectsLabel')}</span>
            <span className="audion-capability-tile__deck">{t('home.projectsDeck')}</span>
          </Link>
          <Link href={paths.routes.targetGroups} className="audion-capability-tile audion-home-cta">
            <span className="audion-capability-tile__kicker">{t('home.groupsKicker')}</span>
            <span className="audion-capability-tile__label">{t('home.groupsLabel')}</span>
            <span className="audion-capability-tile__deck">{t('home.groupsDeck')}</span>
          </Link>
          <Link href={paths.routes.journeys} className="audion-capability-tile audion-home-cta">
            <span className="audion-capability-tile__kicker">{t('home.journeysKicker')}</span>
            <span className="audion-capability-tile__label">{t('home.journeysLabel')}</span>
            <span className="audion-capability-tile__deck">{t('home.journeysDeck')}</span>
          </Link>
          <Link href={paths.routes.chat} className="audion-capability-tile audion-home-cta">
            <span className="audion-capability-tile__kicker">{t('home.chatKicker')}</span>
            <span className="audion-capability-tile__label">{t('home.chatLabel')}</span>
            <span className="audion-capability-tile__deck">{t('home.chatDeck')}</span>
          </Link>
        </div>
      </HomeChapter>

      <HomeChapter
        eyebrow={t('home.recentEyebrow')}
        title={t('home.recentTitle')}
        deck={t('home.recentDeck')}
      >
        <div className="audion-home-recent-columns" aria-label={t('home.recentAria')}>
          <RecentColumn
            title={t('home.recentPersonas')}
            ariaLabel={t('home.recentPersonasAria')}
            empty={
              recentPersonas.length === 0 ? (
                <EmptyState className="audion-home-chapter__empty">
                  {t('home.emptyPersonas')}{' '}
                  <Link href={paths.routes.personas}>{t('home.emptyPersonasCta')}</Link>.
                </EmptyState>
              ) : undefined
            }
          >
            {recentPersonas.map((p, index) => (
              <li key={p.id}>
                <span className="audion-magazine-list-num" aria-hidden>
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div className="audion-home-recent-list__main">
                  <Link
                    href={paths.routes.personaDetail(p.id)}
                    className="audion-home-recent-list__title"
                  >
                    {p.name}
                  </Link>
                  <Text role="meta" as="p" className="audion-home-recent-list__meta">
                    {p.role || p.status}
                    {p.role ? ` · ${p.status}` : ''}
                  </Text>
                </div>
              </li>
            ))}
          </RecentColumn>

          <RecentColumn
            title={t('home.recentProjects')}
            ariaLabel={t('home.recentProjectsAria')}
            empty={
              recentProjects.length === 0 ? (
                <EmptyState className="audion-home-chapter__empty">
                  {t('home.emptyProjects')}{' '}
                  <Link href={paths.routes.projects}>{t('home.emptyProjectsCta')}</Link>.
                </EmptyState>
              ) : undefined
            }
          >
            {recentProjects.map((p, index) => (
              <li key={p.id}>
                <span className="audion-magazine-list-num" aria-hidden>
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div className="audion-home-recent-list__main">
                  <Link
                    href={paths.routes.projectDetail(p.id)}
                    className="audion-home-recent-list__title"
                  >
                    {p.name}
                  </Link>
                  <Text role="meta" as="p" className="audion-home-recent-list__meta">
                    {t(
                      p.personaCount === 1 ? 'home.personaOne' : 'home.personaMany',
                      { count: p.personaCount },
                    )}
                    {' · '}
                    {p.status}
                  </Text>
                </div>
              </li>
            ))}
          </RecentColumn>

          <RecentColumn
            title={t('home.recentGroups')}
            ariaLabel={t('home.recentGroupsAria')}
            empty={
              recentGroups.length === 0 ? (
                <EmptyState className="audion-home-chapter__empty">
                  {t('home.emptyGroups')}{' '}
                  <Link href={paths.routes.targetGroups}>{t('home.emptyGroupsCta')}</Link>.
                </EmptyState>
              ) : undefined
            }
          >
            {recentGroups.map((g, index) => (
              <li key={g.id}>
                <span className="audion-magazine-list-num" aria-hidden>
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div className="audion-home-recent-list__main">
                  <Link
                    href={paths.routes.targetGroupDetail(g.id)}
                    className="audion-home-recent-list__title"
                  >
                    {g.name}
                  </Link>
                  <Text role="meta" as="p" className="audion-home-recent-list__meta">
                    {g.segment || g.status}
                    {g.segment ? ` · ${g.status}` : ''}
                  </Text>
                </div>
              </li>
            ))}
          </RecentColumn>
        </div>
      </HomeChapter>

      <HomeChapter
        eyebrow={t('home.journeysEyebrow')}
        title={t('home.journeysStripTitle')}
        deck={t('home.journeysStripDeck')}
        meta={recentJourneys.length > 0 ? `${recentJourneys.length}` : undefined}
      >
        {recentJourneys.length === 0 ? (
          <EmptyState className="audion-home-chapter__empty">
            {t('home.emptyJourneys')}{' '}
            <Link href={paths.routes.journeys}>{t('home.emptyJourneysCta')}</Link>.
          </EmptyState>
        ) : (
          <div className="audion-home-journeys" aria-label={t('home.journeysStripAria')}>
            {recentJourneys.map((j) => (
              <HomeJourneyCard key={j.id} journey={j} />
            ))}
          </div>
        )}
      </HomeChapter>
    </article>
  )
}
