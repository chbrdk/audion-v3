'use client'

import React, { useEffect, useState } from 'react'
import type { ChatShareMoodboard } from '@audion-v3/contracts'
import { Flyout, IconMoodboard, SectionChrome } from '@msqdx/ui'
import { paths } from '../lib/paths'

export function ChatMoodboardStrip({
  personaId,
  projectId,
  tiles,
  triggerClassName = 'audion-chat-topbar-icon',
}: {
  personaId: string
  projectId?: string | null
  /** Optional preloaded tiles (from persona visuals). */
  tiles?: ChatShareMoodboard['tiles']
  triggerClassName?: string
}) {
  const [board, setBoard] = useState<ChatShareMoodboard | null>(
    tiles?.length
      ? { personaId, projectId: projectId ?? null, styleKeywords: [], tiles }
      : null,
  )

  useEffect(() => {
    if (tiles?.length) {
      setBoard({ personaId, projectId: projectId ?? null, styleKeywords: [], tiles })
      return
    }
    let cancelled = false
    async function load() {
      try {
        const qs = projectId ? `?projectId=${encodeURIComponent(projectId)}` : ''
        const res = await fetch(`${paths.routes.apiChatShareMoodboard(personaId)}${qs}`)
        if (!res.ok) return
        const data = (await res.json()) as ChatShareMoodboard
        if (!cancelled) setBoard(data)
      } catch {
        /* relative URL / offline — strip stays empty */
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [personaId, projectId, tiles])

  if (!board?.tiles.length) return null

  return (
    <Flyout
      label="Moodboard"
      icon={<IconMoodboard />}
      resetKey={personaId}
      triggerClassName={triggerClassName}
      panelClassName="audion-chat-moodboard-flyover"
    >
      {() => (
        <>
          <SectionChrome quiet title="Moodboard" meta={`${board.tiles.length}`} as="h3" />
          <ul className="audion-chat-moodboard-tiles">
            {board.tiles.map((tile) => (
              <li key={tile.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={tile.imageUrl} alt={tile.caption || tile.category || 'Moodboard tile'} />
                {tile.caption ? <span>{tile.caption}</span> : null}
              </li>
            ))}
          </ul>
        </>
      )}
    </Flyout>
  )
}
