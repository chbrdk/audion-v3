'use client'

import type { ReactNode } from 'react'
import { FloatingPanel, type FloatingPanelVariant } from '@msqdx/ui'
import type { RailDockEdge } from '../lib/msqdx-ui-shell'

/**
 * Thin Audion wrapper — dock keys + flow board classNames on DS FloatingPanel.
 * @see specs/domain/ux-test-flow-model.md — Workspace magazine (Phase 8)
 */
export function UxFlowFloatingPanel({
  children,
  className,
  storageKey,
  defaultEdge = 'top',
  defaultOffset = 0.5,
  title,
  ariaLabel,
  variant = 'panel',
}: {
  children: ReactNode
  className?: string
  storageKey: string
  defaultEdge?: RailDockEdge
  defaultOffset?: number
  title?: string
  ariaLabel?: string
  variant?: FloatingPanelVariant
}) {
  return (
    <FloatingPanel
      storageKey={storageKey}
      defaultEdge={defaultEdge}
      defaultOffset={defaultOffset}
      title={title}
      ariaLabel={ariaLabel}
      variant={variant}
      surface="solid"
      className={['audion-flow-float-panel', className].filter(Boolean).join(' ')}
    >
      {children}
    </FloatingPanel>
  )
}
