'use client'

import { useState } from 'react'
import { Button, Text } from '@msqdx/ui'
import { paths } from '../lib/paths'

type Props = {
  projectId: string
  platformProjectId?: string | null
}

export function PublishKnowledgePackCta({ projectId, platformProjectId }: Props) {
  const [status, setStatus] = useState<'idle' | 'busy' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState<string | null>(null)

  const bound = Boolean(platformProjectId?.trim())

  async function onPublish() {
    if (!bound) return
    setStatus('busy')
    setMessage(null)
    try {
      const res = await fetch(paths.routes.apiAiKnowledgePackPublish(projectId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const body = (await res.json().catch(() => null)) as {
        error?: string
        detail?: string
        revision?: number
      } | null
      if (!res.ok) {
        throw new Error(body?.detail || body?.error || `Publish failed (${res.status})`)
      }
      setStatus('done')
      setMessage(
        typeof body?.revision === 'number'
          ? `Re-synced research brief to Collection (rev ${body.revision}).`
          : 'Re-synced research brief to Collection.',
      )
    } catch (e) {
      setStatus('error')
      setMessage(e instanceof Error ? e.message : 'Publish failed')
    }
  }

  return (
    <div className="audion-knowledge-publish" data-section="publish-knowledge-pack">
      <Text role="meta">
        {bound
          ? 'Autosync · Successful research publishes a plain-text brief to the Collection Knowledge Pack. Use re-sync after dossier edits.'
          : 'Bind this project to a Plexon Collection to autosync research briefs.'}
      </Text>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={!bound || status === 'busy'}
        onClick={() => void onPublish()}
      >
        {status === 'busy' ? 'Syncing…' : 'Re-sync to Collection'}
      </Button>
      {message ? <Text role="meta">{message}</Text> : null}
    </div>
  )
}
