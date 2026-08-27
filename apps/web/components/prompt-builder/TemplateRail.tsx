'use client'

import React from 'react'
import type {
  SettingsAssistTemplateSummary,
  SettingsPersonaPromptSummary,
} from '@audion-v3/contracts'
import { Chip, Field, Input, Text } from '@msqdx/ui'
import { useT } from '../../lib/user-prefs'

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
  const t = useT()
  const q = search.trim().toLowerCase()
  const assistFiltered = assist.filter(
    (row) =>
      !q ||
      row.id.toLowerCase().includes(q) ||
      row.label.toLowerCase().includes(q) ||
      row.category.toLowerCase().includes(q),
  )
  const personaFiltered = personas.filter(
    (p) => !q || p.name.toLowerCase().includes(q) || p.personaId.toLowerCase().includes(q),
  )

  return (
    <aside className="pb-rail audion-stack" data-testid="pb-template-rail">
      <Text role="headline" as="h3">
        {t('prompts.catalog')}
      </Text>
      <Field label={t('common.search')}>
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t('prompts.filterPh')}
          data-testid="pb-rail-search"
        />
      </Field>

      <div className="pb-rail__section">
        <Text role="meta" as="h4">
          {t('prompts.assistCount', { count: assistFiltered.length })}
        </Text>
        <ul className="pb-rail__list">
          {assistFiltered.map((row) => {
            const active = selectedKind === 'assist' && selectedId === row.id
            return (
              <li key={row.id}>
                <button
                  type="button"
                  className={`pb-rail__item ${active ? 'pb-rail__item--active' : ''}`}
                  onClick={() => onSelectAssist(row.id)}
                  data-testid={`pb-assist-${row.id}`}
                >
                  <span className="pb-rail__item-title">{row.label}</span>
                  <span className="pb-rail__item-meta">
                    {row.id}
                    {row.overridden ? (
                      <>
                        {' '}
                        <Chip static size="sm">
                          {t('prompts.overridden')}
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
          {t('prompts.personaChatCount', { count: personaFiltered.length })}
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
                          {t('prompts.custom')}
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
