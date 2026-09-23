'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Room, RoomEvent, Track } from 'livekit-client'
import { Text } from '@msqdx/ui'
import type { ChatVideoCallProvider, ChatVideoSessionMedia } from '@audion-v3/contracts'
import { paths } from '../lib/paths'
import { tavusEmbedUrl } from '../lib/tavus/ids'
import { useT } from '../lib/user-prefs'

export type VideoCallSessionConfig = {
  provider: ChatVideoCallProvider
  conversationId?: string | null
  media: ChatVideoSessionMedia
}

type Props = {
  session: VideoCallSessionConfig
  personaName?: string | null
}

function LiveKitVideoPanel({
  url,
  token,
  title,
}: {
  url: string
  token: string
  title: string
}) {
  const t = useT()
  const remoteRef = useRef<HTMLVideoElement>(null)
  const localRef = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const room = new Room()
    async function connect() {
      try {
        room.on(RoomEvent.TrackSubscribed, (track) => {
          if (track.kind === Track.Kind.Video && remoteRef.current) {
            track.attach(remoteRef.current)
          }
          if (track.kind === Track.Kind.Audio) {
            const el = track.attach()
            el.dataset.audionLivekitAudio = '1'
            document.body.appendChild(el)
          }
        })
        room.on(RoomEvent.LocalTrackPublished, (pub) => {
          const track = pub.track
          if (track?.kind === Track.Kind.Video && localRef.current) {
            track.attach(localRef.current)
          }
        })
        await room.connect(url, token)
        if (cancelled) {
          await room.disconnect()
          return
        }
        await room.localParticipant.setCameraEnabled(true)
        await room.localParticipant.setMicrophoneEnabled(true)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : t('tavus.noUrl'))
        }
      }
    }
    void connect()
    return () => {
      cancelled = true
      document.querySelectorAll('[data-audion-livekit-audio="1"]').forEach((el) => el.remove())
      void room.disconnect()
    }
  }, [url, token, t])

  if (error) {
    return (
      <div className="audion-tavus-video-panel audion-tavus-video-panel--empty" role="status">
        <Text role="body">{error}</Text>
      </div>
    )
  }

  return (
    <div className="audion-video-call-livekit" aria-label={title}>
      <video ref={remoteRef} className="audion-video-call-livekit__remote" autoPlay playsInline />
      <video
        ref={localRef}
        className="audion-video-call-livekit__local"
        autoPlay
        playsInline
        muted
      />
    </div>
  )
}

export function VideoCallPanel({ session, personaName }: Props) {
  const t = useT()
  const conversationId = session.conversationId?.trim() || null
  const provider = session.provider

  useEffect(() => {
    if (!conversationId) return
    return () => {
      void fetch(paths.routes.apiChatVideoSession, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, provider }),
        keepalive: true,
      })
    }
  }, [conversationId, provider])

  const title = personaName
    ? t('tavus.callWith', { name: personaName })
    : t('tavus.iframeTitle')

  if (session.media.kind === 'livekit') {
    return (
      <div className="audion-tavus-video-panel">
        {personaName ? (
          <p className="audion-tavus-video-caption">{t('tavus.callWith', { name: personaName })}</p>
        ) : null}
        <LiveKitVideoPanel url={session.media.url} token={session.media.token} title={title} />
      </div>
    )
  }

  const url = session.media.url?.trim()
  if (!url) {
    return (
      <div className="audion-tavus-video-panel audion-tavus-video-panel--empty" role="status">
        <Text role="body">{t('tavus.noUrl')}</Text>
      </div>
    )
  }
  const embedUrl =
    provider === 'tavus' ? tavusEmbedUrl(url, session.media.token) : url

  return (
    <div className="audion-tavus-video-panel">
      {personaName ? (
        <p className="audion-tavus-video-caption">{t('tavus.callWith', { name: personaName })}</p>
      ) : null}
      <iframe
        src={embedUrl}
        title={title}
        allow="camera; microphone; fullscreen; display-capture"
      />
    </div>
  )
}
