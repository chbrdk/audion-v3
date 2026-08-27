'use client'

import React from 'react'
import { Field, Hint, Input, Text, Textarea } from '@msqdx/ui'
import { useT } from '../../lib/user-prefs'

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
  const t = useT()
  return (
    <div className="pb-context audion-stack" data-testid="pb-context-panel">
      <Text role="headline" as="h3">
        {t('prompts.testContext')}
      </Text>
      <Hint panel>
        {useMockData
          ? 'Mock data fills missing ${vars}. Freeform fields below override mocks.'
          : 'Only the fields below are used for preview/test vars.'}
      </Hint>
      <Field label={t('prompts.locale')}>
        <Input
          value={locale}
          onChange={(e) => onLocaleChange(e.target.value)}
          data-testid="pb-locale"
        />
      </Field>
      <Field label={t('prompts.context')}>
        <Textarea
          value={context}
          onChange={(e) => onContextChange(e.target.value)}
          rows={3}
          data-testid="pb-context"
        />
      </Field>
      <Field label={t('prompts.personaProfile')}>
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
