'use client'

import React from 'react'
import { Field, Hint, Input, Text, Textarea } from '@msqdx/ui'

type Props = {
  locale: string
  onLocaleChange: (v: string) => void
  context: string
  onContextChange: (v: string) => void
  personaProfile: string
  onPersonaProfileChange: (v: string) => void
  useMockData: boolean
}

export function VariableContextPanel({
  locale,
  onLocaleChange,
  context,
  onContextChange,
  personaProfile,
  onPersonaProfileChange,
  useMockData,
}: Props) {
  return (
    <div className="pb-context audion-stack" data-testid="pb-context-panel">
      <Text role="headline" as="h3">
        Test context
      </Text>
      <Hint panel>
        {useMockData
          ? 'Mock data fills missing ${vars}. Freeform fields below override mocks.'
          : 'Only the fields below are used for preview/test vars.'}
      </Hint>
      <Field label="Locale">
        <Input
          value={locale}
          onChange={(e) => onLocaleChange(e.target.value)}
          data-testid="pb-locale"
        />
      </Field>
      <Field label="Context">
        <Textarea
          value={context}
          onChange={(e) => onContextChange(e.target.value)}
          rows={3}
          data-testid="pb-context"
        />
      </Field>
      <Field label="Persona profile">
        <Textarea
          value={personaProfile}
          onChange={(e) => onPersonaProfileChange(e.target.value)}
          rows={4}
          data-testid="pb-profile"
        />
      </Field>
    </div>
  )
}
