'use client'

import React from 'react'
import type { TargetGroupDetail } from '@audion-v3/contracts'
import { AudionAskAllChatPanel } from './audion-ask-all-chat-panel'
import {
  selectTgChatPersonas,
} from '../lib/chat/tg-ask-all'

type Props = {
  targetGroup: TargetGroupDetail | null
  onBusyChange?: (busy: boolean) => void
}

export function AudionTargetGroupChatPanel({ targetGroup, onBusyChange }: Props) {
  const linked = selectTgChatPersonas(targetGroup?.linkedPersonas)
  const total = targetGroup?.linkedPersonas?.length ?? 0

  return (
    <AudionAskAllChatPanel
      scopeKey={targetGroup?.id ?? null}
      scopeName={targetGroup?.name ?? null}
      personas={linked}
      totalBeforeCap={total}
      projectId={targetGroup?.projectId ?? null}
      ariaLabel="Target group chat"
      emptyPick="Pick a target group to ask all linked personas at once."
      emptyNoPersonas={
        targetGroup
          ? `${targetGroup.name} has no linked personas yet.`
          : 'No linked personas.'
      }
      emptyPrompt={
        targetGroup
          ? `Ask up to ${linked.length} persona${linked.length === 1 ? '' : 's'} in ${targetGroup.name} — answers appear side by side.`
          : 'Ask linked personas — answers appear side by side.'
      }
      composerPlaceholder={
        linked.length
          ? `Ask all ${linked.length} personas…`
          : 'Select a target group with personas…'
      }
      pickRequiredError="Pick a target group with linked personas."
      questionRequiredError="Enter a question for the target group."
      onBusyChange={onBusyChange}
    />
  )
}
