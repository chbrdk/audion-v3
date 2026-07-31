'use client'

import React from 'react'
import type { SettingsAssistPromptTestResponse } from '@audion-v3/contracts'
import { Alert, Button, Text } from '@msqdx/ui'

type Props = {
  result: SettingsAssistPromptTestResponse | null
  error: string | null
  testing: boolean
  onClear: () => void
}

export function ExecutionOutputPanel({ result, error, testing, onClear }: Props) {
  return (
    <div className="pb-output audion-stack" data-testid="pb-execution-output">
      <div className="pb-output__head">
        <Text role="headline" as="h3">
          Output
        </Text>
        {(result || error) && !testing ? (
          <Button type="button" size="sm" variant="ghost" onClick={onClear}>
            Clear
          </Button>
        ) : null}
      </div>
      {testing ? <Text role="meta">Running…</Text> : null}
      {error ? <Alert tone="error">{error}</Alert> : null}
      {result ? (
        <>
          <Text role="meta">
            {result.stubbed ? 'Stubbed' : 'Native'} · {result.templateId}
          </Text>
          <pre className="pb-output__pre" data-testid="pb-output-text">
            {result.text || JSON.stringify(result.json ?? result.suggestions, null, 2)}
          </pre>
        </>
      ) : null}
      {!testing && !result && !error ? (
        <Text role="meta">Run Test to see assist output here.</Text>
      ) : null}
    </div>
  )
}
