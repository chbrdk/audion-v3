'use client'

import React, { useMemo, useState } from 'react'
import { Chip, Field, Input, Text } from '@msqdx/ui'
import {
  EXTENDED_VARIABLES,
  STANDARD_VARIABLES,
  type VariableCategory,
  type VariableDefinition,
} from './variableDefinitions'

const MIME = 'text/variable-syntax'

type Props = {
  onInsert: (syntax: string) => void
}

const CATEGORIES: VariableCategory[] = ['journey', 'phase', 'persona', 'control']

export function VariablePalette({ onInsert }: Props) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const match = (v: VariableDefinition) =>
      !q ||
      v.name.toLowerCase().includes(q) ||
      v.syntax.toLowerCase().includes(q) ||
      v.description.toLowerCase().includes(q)
    return {
      standard: STANDARD_VARIABLES.filter(match),
      extended: EXTENDED_VARIABLES.filter(match),
    }
  }, [query])

  function renderGroup(title: string, items: VariableDefinition[]) {
    if (!items.length) return null
    return (
      <div className="pb-palette__group" key={title}>
        <Text role="meta" as="h4" className="pb-palette__heading">
          {title}
        </Text>
        <div className="pb-palette__chips">
          {items.map((v) => (
            <Chip
              key={v.syntax}
              size="sm"
              title={v.description}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData(MIME, v.syntax)
                e.dataTransfer.effectAllowed = 'copy'
              }}
              onClick={() => onInsert(v.syntax)}
              data-testid={`pb-var-${v.name}`}
            >
              {v.syntax}
            </Chip>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="pb-palette audion-stack" data-testid="pb-variable-palette">
      <Text role="headline" as="h3">
        Variables
      </Text>
      <Field label="Search">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="journey_name…"
          data-testid="pb-var-search"
        />
      </Field>
      {CATEGORIES.map((cat) =>
        renderGroup(
          cat,
          filtered.standard.filter((v) => v.category === cat),
        ),
      )}
      {renderGroup('extended', filtered.extended)}
    </div>
  )
}

export { MIME as VARIABLE_MIME }
