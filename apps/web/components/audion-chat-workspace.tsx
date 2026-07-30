'use client'

import React, { useMemo, useState } from 'react'
import type { ChatConversationDetail, PersonaSummary } from '@audion-v3/contracts'
import { Field } from '@msqdx/ui'
import { AppShell } from './app-shell'
import { AudionChatPanel } from './audion-chat-panel'
import { Select } from '../lib/msqdx-ui-client'
import { paths } from '../lib/paths'

type Props = {
  personas: PersonaSummary[]
  initialPersonaId: string | null
  initialConversation: ChatConversationDetail | null
  initialDraft?: string | null
}

export function AudionChatWorkspace({
  personas,
  initialPersonaId,
  initialConversation,
  initialDraft = null,
}: Props) {
  const [personaId, setPersonaId] = useState(
    initialPersonaId || initialConversation?.personaId || personas[0]?.id || '',
  )
  const [busy, setBusy] = useState(false)

  const personaOptions = useMemo(
    () => personas.map((p) => ({ value: p.id, label: `${p.name} · ${p.role}` })),
    [personas],
  )

  return (
    <AppShell
      leading={
        <Field
          label="Persona"
          size="md"
          htmlFor="chat-persona"
          className="audion-chat-persona-field"
        >
          <Select
            id="chat-persona"
            options={personaOptions}
            value={personaId}
            onChange={setPersonaId}
            disabled={busy || !personaOptions.length}
          />
        </Field>
      }
      actions={
        <a className="audion-link audion-chat-history-link" href={paths.routes.chatHistory}>
          History
        </a>
      }
    >
      <h1 className="visually-hidden">Chat</h1>
      <AudionChatPanel
        personas={personas}
        personaId={personaId}
        onBusyChange={setBusy}
        initialConversation={initialConversation}
        initialDraft={initialDraft}
      />
    </AppShell>
  )
}
