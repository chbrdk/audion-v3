'use client'

import React, { useMemo, useState } from 'react'
import { Button, SectionChrome } from '@msqdx/ui'
import { buildChatShareHref } from '../lib/chat/share'
import { ChatFlyout } from './chat-flyout'
import { IconShare } from './nav-icons'

export function ChatShareFlyout({
  personaId,
  personaName,
  projectId,
}: {
  personaId: string
  personaName?: string | null
  projectId: string
}) {
  const [copied, setCopied] = useState(false)
  const href = useMemo(
    () => buildChatShareHref({ personaId, projectId }),
    [personaId, projectId],
  )
  const absolute =
    typeof window !== 'undefined' ? `${window.location.origin}${href}` : href

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(absolute)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      /* ignore */
    }
  }

  return (
    <ChatFlyout
      label="Share"
      icon={<IconShare />}
      resetKey={personaId}
      panelClassName="audion-chat-share-flyover"
      disabled={!personaId || !projectId}
    >
      {() => (
        <>
          <SectionChrome quiet title="Share chat" as="h3" />
          <p className="audion-edit-lede audion-chat-flyover-lede">
            Share this link so others can open a chat with{' '}
            <strong>{personaName || 'this persona'}</strong>.
          </p>
          <input
            className="audion-chat-share-url"
            readOnly
            value={absolute}
            aria-label="Share link"
            onFocus={(e) => e.currentTarget.select()}
          />
          <div className="audion-chat-flyover-actions">
            <Button type="button" size="sm" onClick={() => void copyLink()}>
              {copied ? 'Copied' : 'Copy link'}
            </Button>
          </div>
        </>
      )}
    </ChatFlyout>
  )
}
