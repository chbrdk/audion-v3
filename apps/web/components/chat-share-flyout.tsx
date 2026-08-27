'use client'

import React, { useMemo, useState } from 'react'
import { Button, Flyout, IconShare, SectionChrome } from '@msqdx/ui'
import { buildChatShareHref } from '../lib/chat/share'
import { useT } from '../lib/user-prefs'

export function ChatShareFlyout({
  personaId,
  personaName,
  projectId,
}: {
  personaId: string
  personaName?: string | null
  projectId: string
}) {
  const t = useT()
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
    <Flyout
      label={t('chat.share')}
      icon={<IconShare />}
      resetKey={personaId}
      triggerClassName="audion-chat-topbar-icon"
      panelClassName="audion-chat-share-flyover"
      disabled={!personaId || !projectId}
    >
      {() => (
        <>
          <SectionChrome quiet title={t('chat.shareTitle')} as="h3" />
          <p className="audion-edit-lede audion-chat-flyover-lede">
            {t('chat.shareLede', {
              name: personaName || t('chat.shareLedeFallback'),
            })}
          </p>
          <input
            className="audion-chat-share-url"
            readOnly
            value={absolute}
            aria-label={t('chat.shareLinkAria')}
            onFocus={(e) => e.currentTarget.select()}
          />
          <div className="audion-chat-flyover-actions">
            <Button type="button" size="sm" onClick={() => void copyLink()}>
              {copied ? t('common.copied') : t('chat.copyLink')}
            </Button>
          </div>
        </>
      )}
    </Flyout>
  )
}
