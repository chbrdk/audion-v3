'use client'

import React, { useCallback, useRef, useState, type ReactNode } from 'react'
import { useT } from '../../lib/user-prefs'

type ResizablePanelProps = {
  children: ReactNode
  initialWidth?: number
  minWidth?: number
  maxWidth?: number
  side?: 'left' | 'right'
  className?: string
}

export function ResizablePanel({
  children,
  initialWidth = 280,
  minWidth = 200,
  maxWidth = 480,
  side = 'left',
  className,
}: ResizablePanelProps) {
  const t = useT()
  const [width, setWidth] = useState(initialWidth)
  const [collapsed, setCollapsed] = useState(false)
  const startX = useRef(0)
  const startW = useRef(0)

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      startX.current = e.clientX
      startW.current = width
      const onMove = (ev: MouseEvent) => {
        const delta = side === 'left' ? ev.clientX - startX.current : startX.current - ev.clientX
        const next = Math.min(maxWidth, Math.max(minWidth, startW.current + delta))
        setWidth(next)
        setCollapsed(false)
      }
      const onUp = () => {
        window.removeEventListener('mousemove', onMove)
        window.removeEventListener('mouseup', onUp)
      }
      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseup', onUp)
    },
    [maxWidth, minWidth, side, width],
  )

  return (
    <div
      className={`pb-resizable ${side === 'left' ? 'pb-resizable--left' : 'pb-resizable--right'} ${className ?? ''}`}
      style={{ width: collapsed ? 36 : width, flexShrink: 0 }}
      data-collapsed={collapsed || undefined}
    >
      {!collapsed ? <div className="pb-resizable__body">{children}</div> : null}
      <button
        type="button"
        className="pb-resizable__handle"
        aria-label={collapsed ? t('common.expand') : t('common.collapse')}
        onMouseDown={onMouseDown}
        onDoubleClick={() => setCollapsed((c) => !c)}
      />
    </div>
  )
}
