'use client'

import React, { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Button } from '@msqdx/ui'

/** Shared open/close for chat topbar flyouts (Escape + outside click). */
export function useChatFlyout(resetKey?: string | null) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('mousedown', onPointer)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('mousedown', onPointer)
    }
  }, [open])

  useEffect(() => {
    setOpen(false)
  }, [resetKey])

  return { open, setOpen, rootRef, toggle: () => setOpen((v) => !v) }
}

export function ChatFlyout({
  label,
  icon,
  resetKey,
  triggerClassName = 'audion-chat-topbar-icon',
  panelClassName,
  disabled,
  children,
}: {
  label: string
  icon: ReactNode
  resetKey?: string | null
  triggerClassName?: string
  panelClassName?: string
  disabled?: boolean
  children: (ctx: { close: () => void }) => ReactNode
}) {
  const panelId = useId()
  const { open, setOpen, rootRef, toggle } = useChatFlyout(resetKey)

  return (
    <div className="audion-chat-flyout" ref={rootRef}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={[triggerClassName, open ? 'is-active' : undefined].filter(Boolean).join(' ')}
        icon={icon}
        aria-label={label}
        aria-expanded={open}
        aria-controls={panelId}
        disabled={disabled}
        onClick={toggle}
      />
      {open ? (
        <div
          id={panelId}
          className={['audion-chat-flyover', 'ds-motion-reveal', panelClassName]
            .filter(Boolean)
            .join(' ')}
          role="dialog"
          aria-label={label}
        >
          {children({ close: () => setOpen(false) })}
        </div>
      ) : null}
    </div>
  )
}
