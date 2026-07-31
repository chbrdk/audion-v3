'use client'

import React from 'react'
import type {
  SettingsAssistTemplateSummary,
  SettingsPersonaPromptSummary,
} from '@audion-v3/contracts'
import { Chip, Field, Input, Text } from '@msqdx/ui'

export type CatalogKind = 'assist' | 'persona'

type Props = {
  search: string
  onSearchChange: (v: string) => void
  assist: SettingsAssistTemplateSummary[]
  personas: SettingsPersonaPromptSummary[]
  selectedKind: CatalogKind
  selectedId: string
  onSelectAssist: (id: string) => void
  onSelectPersona: (personaId: string) => void
}

export function TemplateRail({
  search,
  onSearchChange,
  assist,
  personas,
  selectedKind,
  selectedId,
  onSelectAssist,
  onSelectPersona,
}: Props) {
  const q = search.trim().toLowerCase()
  const assistFiltered = assist.filter(
    (t) =>
      !q ||
      t.id.toLowerCase().includes(q) ||
      t.label.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q),
  )
  const personaFiltered = personas.filter(
    (p) => !q || p.name.toLowerCase().includes(q) || p.personaId.toLowerCase().includes(q),
  )

  return (
    <aside className="pb-rail audion-stack" data-testid="pb-template-rail">
      <Text role="headline" as="h3">
        Catalog
      </Text>
      <Field label="Search">
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Filter templates…"
          data-testid="pb-rail-search"
        />
      </Field>

      <div className="pb-rail__section">
        <Text role="meta" as="h4">
          Assist ({assistFiltered.length})
        </Text>
        <ul className="pb-rail__list">
          {assistFiltered.map((t) => {
            const active = selectedKind === 'assist' && selectedId === t.id
            return (
              <li key={t.id}>
                <button
                  type="button"
                  className={`pb-rail__item ${active ? 'pb-rail__item--active' : ''}`}
                  onClick={() => onSelectAssist(t.id)}
                  data-testid={`pb-assist-${t.id}`}
                >
                  <span className="pb-rail__item-title">{t.label}</span>
                  <span className="pb-rail__item-meta">
                    {t.id}
                    {t.overridden ? (
                      <>
                        {' '}
                        <Chip static size="sm">
                          overridden
                        </Chip>
                      </>
                    ) : null}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      <div className="pb-rail__section">
        <Text role="meta" as="h4">
          Persona chat ({personaFiltered.length})
        </Text>
        <ul className="pb-rail__list">
          {personaFiltered.map((p) => {
            const active = selectedKind === 'persona' && selectedId === p.personaId
            return (
              <li key={p.personaId}>
                <button
                  type="button"
                  className={`pb-rail__item ${active ? 'pb-rail__item--active' : ''}`}
                  onClick={() => onSelectPersona(p.personaId)}
                  data-testid={`pb-persona-${p.personaId}`}
                >
                  <span className="pb-rail__item-title">{p.name}</span>
                  <span className="pb-rail__item-meta">
                    {p.personaId}
                    {p.hasCustom ? (
                      <>
                        {' '}
                        <Chip static size="sm">
                          custom
                        </Chip>
                      </>
                    ) : null}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </aside>
  )
}
