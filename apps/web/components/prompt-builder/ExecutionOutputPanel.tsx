'use client'

import React from 'react'
import type { SettingsAssistPromptTestResponse } from '@audion-v3/contracts'
import { Alert, Button, Text } from '@msqdx/ui'
import { useT } from '../../lib/user-prefs'

type Props = {
  result: SettingsAssistPromptTestResponse | null
  error: string | null
  testing: boolean
  onClear: () => void
}

export function ExecutionOutputPanel({ result, error, testing, onClear }: Props) {
  const t = useT()
  return (
    <div className="pb-output audion-stack" data-testid="pb-execution-output">
      <div className="pb-output__head">
        <Text role="headline" as="h3">
          {t('prompts.output')}
        </Text>
        {(result || error) && !testing ? (
          <Button type="button" size="sm" variant="ghost" onClick={onClear}>
            {t('common.clear')}
          </Button>
        ) : null}
      </div>
      {testing ? <Text role="meta">{t('prompts.running')}</Text> : null}
      {error ? <Alert tone="error">{error}</Alert> : null}
      {result ? (
        <>
          <Text role="meta">
            {result.stubbed ? t('prompts.stubbed') : t('prompts.native')} · {result.templateId}
          </Text>
          <pre className="pb-output__pre" data-testid="pb-output-text">
            {result.text || JSON.stringify(result.json ?? result.suggestions, null, 2)}
          </pre>
        </>
      ) : null}
      {!testing && !result && !error ? (
        <Text role="meta">{t('prompts.runTestHint')}</Text>
      ) : null}
    </div>
  )
}
