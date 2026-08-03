'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import type { TargetGroupLinkedPersona } from '@audion-v3/contracts'
import { EmptyState, Panel, SectionChrome, Text } from '@msqdx/ui'
import { paths } from '../lib/paths'

export type LinkedPersonasLayout = 'cards' | 'list'

function readLayout(): LinkedPersonasLayout {
  if (typeof window === 'undefined') return 'cards'
  try {
    const raw = window.sessionStorage.getItem(paths.tgLinkedPersonasLayoutKey)
    return raw === 'list' ? 'list' : 'cards'
  } catch {
    return 'cards'
  }
}

function LayoutSwitch({
  layout,
  onChange,
}: {
  layout: LinkedPersonasLayout
  onChange: (next: LinkedPersonasLayout) => void
}) {
  return (
    <div
      className="audion-editable-comm-layout-switch"
      role="group"
      aria-label="Linked personas layout"
    >
      <button
        type="button"
        className={layout === 'cards' ? 'is-active' : undefined}
        aria-pressed={layout === 'cards'}
        onClick={() => onChange('cards')}
      >
        Cards
      </button>
      <button
        type="button"
        className={layout === 'list' ? 'is-active' : undefined}
        aria-pressed={layout === 'list'}
        onClick={() => onChange('list')}
      >
        List
      </button>
    </div>
  )
}

export function TargetGroupLinkedPersonas({
  personas,
}: {
  personas: TargetGroupLinkedPersona[]
}) {
  const [layout, setLayout] = useState<LinkedPersonasLayout>('cards')

  useEffect(() => {
    setLayout(readLayout())
  }, [])

  function chooseLayout(next: LinkedPersonasLayout) {
    setLayout(next)
    try {
      window.sessionStorage.setItem(paths.tgLinkedPersonasLayoutKey, next)
    } catch {
      /* ignore */
    }
  }

  return (
    <section className="audion-magazine-band audion-tg-linked ds-motion-reveal">
      <div className="audion-editable-comm-chrome audion-tg-linked-chrome">
        <SectionChrome
          quiet
          title="Linked personas"
          meta={`${personas.length}`}
          metaTone="accent"
          as="h3"
        />
        {personas.length > 0 ? <LayoutSwitch layout={layout} onChange={chooseLayout} /> : null}
      </div>

      {!personas.length ? (
        <EmptyState>No personas linked yet.</EmptyState>
      ) : layout === 'cards' ? (
        <ul className="audion-tg-grid audion-tg-grid--nested">
          {personas.map((persona) => (
            <li key={persona.id}>
              <Link
                href={paths.routes.personaDetail(persona.id)}
                className={`audion-tg-card audion-tg-card--${persona.status}`}
              >
                <Panel as="div" variant="card" className="audion-tg-card-panel">
                  <Text role="headline" as="h4" className="audion-tg-card-title">
                    {persona.name}
                  </Text>
                  <p className="audion-tg-card-meta">
                    <span>{persona.role}</span>
                    <span aria-hidden>·</span>
                    <span data-status={persona.status}>{persona.status}</span>
                  </p>
                </Panel>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <ol className="audion-magazine-list audion-tg-linked-list">
          {personas.map((persona, index) => (
            <li key={persona.id}>
              <span className="audion-magazine-list-num" aria-hidden>
                {String(index + 1).padStart(2, '0')}
              </span>
              <Link
                href={paths.routes.personaDetail(persona.id)}
                className="audion-tg-linked-list-row"
              >
                <span className="audion-tg-linked-list-name">{persona.name}</span>
                <span className="audion-tg-linked-list-meta">
                  {persona.role}
                  <span aria-hidden> · </span>
                  <span data-status={persona.status}>{persona.status}</span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
