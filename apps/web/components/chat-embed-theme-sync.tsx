'use client'

import { useEffect } from 'react'
import { applyChatEmbedTheme } from '../lib/chat/embed-theme'
import {
  isChatEmbedHostThemeMessage,
  isTrustedChatEmbedHostOrigin,
} from '../lib/chat/embed-host-protocol'

type Props = {
  initialTheme?: string | null
}

/** Sync Plexon host light/dark into Audion iframe (`html[data-theme]`). */
export function ChatEmbedThemeSync({ initialTheme }: Props) {
  useEffect(() => {
    applyChatEmbedTheme(initialTheme)
  }, [initialTheme])

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (!isTrustedChatEmbedHostOrigin(event.origin)) return
      if (!isChatEmbedHostThemeMessage(event.data)) return
      applyChatEmbedTheme(event.data.themeId)
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  return null
}
