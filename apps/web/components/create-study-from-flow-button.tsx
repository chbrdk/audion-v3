'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { UxStudyFromFlowResult, UxTestFlow } from '@audion-v3/contracts'
import { Button } from '@msqdx/ui'
import { paths } from '../lib/paths'

export function CreateStudyFromFlowButton({
  flowId,
  flowName,
  disabled,
  getFlowSnapshot,
}: {
  flowId: string
  flowName: string
  disabled?: boolean
  /** When provided, POST includes the current (possibly edited) graph. */
  getFlowSnapshot?: () => UxTestFlow
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onCreate() {
    setBusy(true)
    setError(null)
    try {
      const flow = getFlowSnapshot?.()
      const res = await fetch(paths.routes.apiStudiesFromFlow, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flowId,
          name: flowName,
          waveKey: `from-flow-${Date.now().toString(36)}`,
          ...(flow ? { flow } : {}),
        }),
      })
      const data = (await res.json()) as UxStudyFromFlowResult & { error?: string }
      if (!res.ok) {
        setError(data.error || `Create failed (${res.status})`)
        return
      }
      router.push(paths.routes.studyWaveDetail(data.study.id, data.wave.id))
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="audion-flow-create">
      <Button size="md" onClick={() => void onCreate()} disabled={disabled || busy}>
        {busy ? 'Creating…' : 'Create study from flow'}
      </Button>
      {disabled ? (
        <p className="audion-flow-create-hint">Catalog only — full graph / compile comes later.</p>
      ) : null}
      {error ? <p className="audion-flow-create-error">{error}</p> : null}
    </div>
  )
}
