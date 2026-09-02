'use client'

import React from 'react'
import type { PersonaSummary } from '@audion-v3/contracts'
import { AudionAskAllChatPanel } from './audion-ask-all-chat-panel'
import {
  countProjectChatPersonas,
  selectProjectChatPersonas,
} from '../lib/chat/tg-ask-all'

type Props = {
  projectId: string | null
  projectName: string | null
  personas: PersonaSummary[]
  onBusyChange?: (busy: boolean) => void
}

export function AudionProjectChatPanel({
  projectId,
  projectName,
  personas,
  onBusyChange,
}: Props) {
  const selected = selectProjectChatPersonas(personas, projectId)
  const total = countProjectChatPersonas(personas, projectId)

  return (
    <AudionAskAllChatPanel
      scopeKey={projectId}
      scopeName={projectName}
      personas={selected}
      totalBeforeCap={total}
      projectId={projectId}
      ariaLabel="Project chat"
      emptyPick="Pick a project to ask all of its personas at once."
      emptyNoPersonas={
        projectName
          ? `${projectName} has no personas yet.`
          : 'No personas in this project yet.'
      }
      emptyPrompt={
        projectName
          ? `Ask up to ${selected.length} persona${selected.length === 1 ? '' : 's'} in ${projectName} — answers appear side by side.`
          : 'Ask all project personas — answers appear side by side.'
      }
      composerPlaceholder={
        selected.length
          ? `Ask all ${selected.length} personas…`
          : 'Select a project with personas…'
      }
      pickRequiredError="Pick a project with personas."
      questionRequiredError="Enter a question for the project personas."
      onBusyChange={onBusyChange}
    />
  )
}
