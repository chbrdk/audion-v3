'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@msqdx/ui'
import { Dialog } from '../lib/msqdx-ui-client'
import { useT } from '../lib/user-prefs'
import { IconDelete } from './nav-icons'

type HubEntityDeleteButtonProps = {
  name: string
  deleteUrl: string
  ariaLabel: string
  titleKey: 'dialogs.deletePersonaTitle' | 'dialogs.deleteTargetGroupTitle'
  bodyKey: 'dialogs.deletePersonaBody' | 'dialogs.deleteTargetGroupBody'
  className?: string
}

export function HubEntityDeleteButton({
  name,
  deleteUrl,
  ariaLabel,
  titleKey,
  bodyKey,
  className,
}: HubEntityDeleteButtonProps) {
  const t = useT()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onConfirm() {
    setDeleting(true)
    setError(null)
    try {
      const response = await fetch(deleteUrl, { method: 'DELETE' })
      if (!response.ok && response.status !== 204) {
        const err = (await response.json().catch(() => null)) as { error?: string } | null
        throw new Error(err?.error || `Delete failed (${response.status})`)
      }
      setOpen(false)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('dialogs.deleteFailed'))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={`audion-edit-icon-btn audion-delete-icon-btn ${className ?? ''}`.trim()}
        aria-label={ariaLabel}
        title={ariaLabel}
        icon={<IconDelete />}
        disabled={deleting}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setError(null)
          setOpen(true)
        }}
      />
      {open ? (
        <Dialog
          open
          onClose={() => {
            if (!deleting) setOpen(false)
          }}
          className="audion-edit-dialog"
          title={t(titleKey)}
          actions={
            <>
              <Button variant="ghost" size="md" onClick={() => setOpen(false)} disabled={deleting}>
                {t('common.cancel')}
              </Button>
              <Button size="md" onClick={() => void onConfirm()} disabled={deleting}>
                {deleting ? t('common.deleting') : t('common.delete')}
              </Button>
            </>
          }
        >
          <p>{t(bodyKey, { name })}</p>
          {error ? <p className="audion-edit-error">{error}</p> : null}
        </Dialog>
      ) : null}
    </>
  )
}
