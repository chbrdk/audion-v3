'use client'

import React, { useEffect } from 'react'
import { Text } from '@msqdx/ui'
import { paths } from '../lib/paths'
import { tavusEmbedUrl } from '../lib/tavus/ids'

export type TavusSessionConfig = {
  conversationUrl?: string | null
  conversationId?: string | null
  meetingToken?: string | null
}

type Props = {
  session: TavusSessionConfig
  personaName?: string | null
}

export function TavusVideoPanel({ session, personaName }: Props) {
  const url = session.conversationUrl?.trim()
  const conversationId = session.conversationId?.trim() || null

  useEffect(() => {
    if (!conversationId) return
    return () => {
      void fetch(paths.routes.apiChatTavusSession, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId }),
        keepalive: true,
      })
    }
  }, [conversationId])

  if (!url) {
    return (
      <div className="audion-tavus-video-panel audion-tavus-video-panel--empty" role="status">
        <Text role="body">No conversation URL from Tavus.</Text>
      </div>
    )
  }

  const embedUrl = tavusEmbedUrl(url, session.meetingToken)
  const title = personaName ? `Tavus video: ${personaName}` : 'Tavus video call'

  return (
    <div className="audion-tavus-video-panel">
      {personaName ? (
        <p className="audion-tavus-video-caption">Video call with {personaName}</p>
      ) : null}
      <iframe
        src={embedUrl}
        title={title}
        allow="camera; microphone; fullscreen; display-capture"
      />
    </div>
  )
}
