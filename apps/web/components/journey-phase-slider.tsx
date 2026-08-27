'use client'

import React, { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useRouter } from 'next/navigation'
import type { JourneyDetail, JourneyPhase } from '@audion-v3/contracts'
import { Button, Panel, SectionChrome, Text } from '@msqdx/ui'
import { Dialog } from '../lib/msqdx-ui-client'
import { paths } from '../lib/paths'
import { useT } from '../lib/user-prefs'
import { IconDelete, IconEdit } from './nav-icons'
import { GeneratePhaseMomentsButton } from './generate-phase-moments-button'
import { JourneyPhaseEditDialog } from './journey-phase-edit-dialog'

async function patchJourneyPhases(journey: JourneyDetail, phases: JourneyPhase[]) {
  const response = await fetch(paths.routes.apiJourneyDetail(journey.id), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: journey.name,
      journeyType: journey.journeyType,
      status: journey.status,
      description: journey.description,
      targetGroupId: journey.targetGroupId,
      projectId: journey.projectId,
      phases,
    }),
  })
  if (!response.ok) {
    const err = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(err?.error || `Save failed (${response.status})`)
  }
}

function PhaseSlideCard({
  journeyId,
  phase,
  index,
  active,
  onEdit,
  onDelete,
}: {
  journeyId: string
  phase: JourneyPhase
  index: number
  active: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const t = useT()
  return (
    <article
      className={`audion-journey-slide${active ? ' audion-journey-slide--active' : ''}`}
      data-phase-index={index}
      aria-current={active ? 'step' : undefined}
      aria-label={`${t('phases.title')} ${index + 1}: ${phase.name}`}
    >
      <Panel as="div" className="audion-journey-slide-panel">
        <header className="audion-journey-slide-head">
          <div className="audion-journey-slide-head-copy">
            <span className="audion-journey-slide-num" aria-hidden>
              {String(index + 1).padStart(2, '0')}
            </span>
            <Text role="label" className="audion-journey-slide-eyebrow">
              Phase
            </Text>
            <Text role="headline" as="h3" className="audion-journey-slide-title">
              {phase.name}
            </Text>
          </div>
          <div className="audion-journey-slide-actions">
            <GeneratePhaseMomentsButton journeyId={journeyId} phase={phase} />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="audion-edit-icon-btn"
              aria-label={`${t('phases.editPhase')} ${phase.name}`}
              title={t('phases.editPhase')}
              icon={<IconEdit />}
              onClick={onEdit}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="audion-edit-icon-btn audion-delete-icon-btn"
              aria-label={t('phases.deletePhaseAria', { name: phase.name })}
              title={t('common.delete')}
              icon={<IconDelete />}
              onClick={onDelete}
            />
          </div>
        </header>

        <div className="audion-journey-slide-section">
          <Text role="label" className="audion-journey-slide-section-label">
            {t('phases.focus')}
          </Text>
          <p className="audion-journey-slide-summary">
            {phase.summary || t('phases.noFocus')}
          </p>
        </div>

        <div className="audion-journey-slide-section">
          <Text role="label" className="audion-journey-slide-section-label">
            {t('phases.moments')}
          </Text>
          {phase.elements.length ? (
            <ul className="audion-journey-slide-moments">
              {phase.elements.map((el) => (
                <li key={el.id} data-kind={el.kind} className="audion-journey-slide-moment">
                  <span className="audion-journey-slide-moment-kind">{el.kind}</span>
                  <span className="audion-journey-slide-moment-label">{el.label}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="audion-journey-slide-empty-moments">{t('phases.noMoments')}</p>
          )}
        </div>
      </Panel>
    </article>
  )
}

function CreatePhaseSlide({
  index,
  active,
  onCreate,
}: {
  index: number
  active: boolean
  onCreate: () => void
}) {
  const t = useT()
  return (
    <article
      className={`audion-journey-slide audion-journey-slide--create${active ? ' audion-journey-slide--active' : ''}`}
      data-phase-index={index}
      aria-label={t('phases.addNewPhase')}
    >
      <button
        type="button"
        className="audion-journey-slide-create-btn"
        aria-label={t('phases.addNewPhase')}
        onClick={onCreate}
      >
        <Panel as="div" className="audion-journey-slide-panel audion-journey-slide-panel--create">
          <span className="audion-journey-slide-create-mark" aria-hidden>
            +
          </span>
          <Text role="headline" as="span" className="audion-journey-slide-title">
            {t('phases.addNewPhase')}
          </Text>
          <p className="audion-journey-slide-summary">{t('phases.addNext')}</p>
        </Panel>
      </button>
    </article>
  )
}

type PhaseDialogState =
  | { mode: 'create'; phase: null }
  | { mode: 'edit'; phase: JourneyPhase }
  | null

export function JourneyPhaseSlider({ journey }: { journey: JourneyDetail }) {
  const t = useT()
  const router = useRouter()
  const phases = journey.phases
  const createIndex = phases.length
  const slideCount = phases.length + 1
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [dialog, setDialog] = useState<PhaseDialogState>(null)
  const [phaseToDelete, setPhaseToDelete] = useState<JourneyPhase | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const scrollToIndex = useCallback((index: number) => {
    const viewport = viewportRef.current
    if (!viewport) return
    const card = viewport.querySelector<HTMLElement>(`[data-phase-index="${index}"]`)
    if (!card) return
    const left = card.offsetLeft - (viewport.clientWidth - card.offsetWidth) / 2
    viewport.scrollTo({ left: Math.max(0, left), behavior: 'smooth' })
    setActiveIndex(index)
  }, [])

  const handleScroll = useCallback(() => {
    const viewport = viewportRef.current
    if (!viewport) return
    const cards = Array.from(
      viewport.querySelectorAll<HTMLElement>('[data-phase-index]'),
    )
    if (!cards.length) return
    const mid = viewport.scrollLeft + viewport.clientWidth / 2
    let closest = 0
    let best = Number.POSITIVE_INFINITY
    cards.forEach((card, i) => {
      const center = card.offsetLeft + card.offsetWidth / 2
      const dist = Math.abs(center - mid)
      if (dist < best) {
        best = dist
        closest = i
      }
    })
    setActiveIndex(closest)
  }, [])

  useEffect(() => {
    setActiveIndex(0)
  }, [phases])

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      scrollToIndex(Math.min(slideCount - 1, activeIndex + 1))
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      scrollToIndex(Math.max(0, activeIndex - 1))
    }
  }

  function openCreate() {
    setDialog({ mode: 'create', phase: null })
  }

  async function onConfirmDeletePhase() {
    if (!phaseToDelete) return
    setDeleting(true)
    setDeleteError(null)
    try {
      const nextPhases = journey.phases
        .filter((p) => p.id !== phaseToDelete.id)
        .map((p, order) => ({ ...p, order }))
      await patchJourneyPhases(journey, nextPhases)
      setPhaseToDelete(null)
      router.refresh()
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : t('dialogs.deleteFailed'))
    } finally {
      setDeleting(false)
    }
  }

  const onCreateSlide = activeIndex === createIndex
  const countLabel = onCreateSlide
    ? t('common.new')
    : phases.length
      ? `${activeIndex + 1} / ${phases.length}`
      : t('common.new')

  return (
    <section className="audion-journey-timeline ds-motion-reveal" aria-label={t('phases.title')}>
      <div className="audion-journey-timeline-toolbar">
        <SectionChrome quiet title={t('phases.title')} meta={`${phases.length}`} as="h3" />
        <div className="audion-journey-timeline-nav" role="group" aria-label={t('phases.navAria')}>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={t('phases.prevPhase')}
            disabled={activeIndex === 0}
            onClick={() => scrollToIndex(activeIndex - 1)}
          >
            ‹
          </Button>
          <Text role="meta" className="audion-journey-timeline-count">
            {countLabel}
          </Text>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={t('phases.nextPhase')}
            disabled={activeIndex >= slideCount - 1}
            onClick={() => scrollToIndex(activeIndex + 1)}
          >
            ›
          </Button>
        </div>
      </div>

      <div className="audion-journey-timeline-steps" role="tablist" aria-label={t('phases.navAria')}>
        {phases.map((phase, index) => (
          <button
            key={phase.id}
            type="button"
            role="tab"
            aria-selected={index === activeIndex}
            className={`audion-journey-timeline-step${index === activeIndex ? ' audion-journey-timeline-step--active' : ''}`}
            onClick={() => scrollToIndex(index)}
          >
            <span className="audion-journey-timeline-step-index">
              {String(index + 1).padStart(2, '0')}
            </span>
            <span className="audion-journey-timeline-step-label">{phase.name}</span>
          </button>
        ))}
        <button
          type="button"
          role="tab"
          aria-selected={onCreateSlide}
          aria-label={t('phases.addPhase')}
          className={`audion-journey-timeline-step audion-journey-timeline-step--add${onCreateSlide ? ' audion-journey-timeline-step--active' : ''}`}
          onClick={() => {
            scrollToIndex(createIndex)
            openCreate()
          }}
        >
          <span className="audion-journey-timeline-step-index">+</span>
          <span className="audion-journey-timeline-step-label">{t('phases.addPhase')}</span>
        </button>
      </div>

      <div
        ref={viewportRef}
        className="audion-journey-timeline-viewport"
        tabIndex={0}
        onScroll={handleScroll}
        onKeyDown={onKeyDown}
        aria-label={t('phases.title')}
      >
        {phases.map((phase, index) => (
          <PhaseSlideCard
            key={phase.id}
            journeyId={journey.id}
            phase={phase}
            index={index}
            active={index === activeIndex}
            onEdit={() => setDialog({ mode: 'edit', phase })}
            onDelete={() => {
              setDeleteError(null)
              setPhaseToDelete(phase)
            }}
          />
        ))}
        <CreatePhaseSlide
          index={createIndex}
          active={onCreateSlide}
          onCreate={openCreate}
        />
      </div>

      {dialog ? (
        <JourneyPhaseEditDialog
          open
          onClose={() => setDialog(null)}
          mode={dialog.mode}
          journey={journey}
          phase={dialog.phase}
        />
      ) : null}

      {phaseToDelete ? (
        <Dialog
          open
          onClose={() => {
            if (!deleting) setPhaseToDelete(null)
          }}
          className="audion-edit-dialog"
          title={t('phases.deleteTitle')}
          actions={
            <>
              <Button
                variant="ghost"
                size="md"
                onClick={() => setPhaseToDelete(null)}
                disabled={deleting}
              >
                {t('common.cancel')}
              </Button>
              <Button size="md" onClick={() => void onConfirmDeletePhase()} disabled={deleting}>
                {deleting ? t('common.deleting') : t('common.delete')}
              </Button>
            </>
          }
        >
          <p>{t('phases.deleteBody', { name: phaseToDelete.name })}</p>
          {deleteError ? (
            <p className="audion-edit-error" role="alert">
              {deleteError}
            </p>
          ) : null}
        </Dialog>
      ) : null}
    </section>
  )
}
