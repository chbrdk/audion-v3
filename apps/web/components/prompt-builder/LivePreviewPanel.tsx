'use client'

import React, { useMemo } from 'react'
import { Text } from '@msqdx/ui'
import { substituteVars } from '../../lib/ai/prompts/render'
import { generateMockContext } from './mockData'

type Props = {
  prompt: string
  context: Record<string, string>
  useMockData: boolean
}

export function LivePreviewPanel({ prompt, context, useMockData }: Props) {
  const rendered = useMemo(() => {
    const vars = useMockData ? { ...generateMockContext(), ...context } : context
    return substituteVars(prompt, vars)
  }, [prompt, context, useMockData])

  return (
    <div className="pb-preview" data-testid="pb-live-preview">
      <Text role="meta">Resolved prompt (client-side dollar-brace vars only)</Text>
      <pre className="pb-preview__pre">{rendered || '—'}</pre>
    </div>
  )
}
