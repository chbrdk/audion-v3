'use client'

import { useCallback, useEffect, useMemo, useState, type ComponentType, type CSSProperties, type ReactNode } from 'react'
import {
  readRailDockFromStorage,
  remToPx,
  serializeRailDock,
  type RailDockEdge,
} from '@msqdx/ui'

type SnapDockLike = ComponentType<{
  children?: ReactNode
  className?: string
  defaultEdge?: RailDockEdge
  defaultOffset?: number
  edgePadding?: number
  snap?: boolean
  draggable?: boolean
  onEdgeChange?: (edge: RailDockEdge) => void
  onOffsetChange?: (offset: number) => void
  style?: CSSProperties
}>

function readPanelDock(
  storageKey: string,
  defaultEdge: RailDockEdge,
  defaultOffset: number,
): { edge: RailDockEdge; offset: number } {
  try {
    if (!localStorage.getItem(storageKey)) {
      return { edge: defaultEdge, offset: defaultOffset }
    }
  } catch {
    /* ignore */
  }
  return readRailDockFromStorage(storageKey, defaultEdge)
}

export function UxFlowFloatingPanel({
  children,
  className,
  storageKey,
  defaultEdge = 'top',
  defaultOffset = 0.5,
  title,
  ariaLabel,
}: {
  children: ReactNode
  className?: string
  storageKey: string
  defaultEdge?: RailDockEdge
  defaultOffset?: number
  title?: string
  ariaLabel?: string
}) {
  const initial = useMemo(
    () => readPanelDock(storageKey, defaultEdge, defaultOffset),
    [storageKey, defaultEdge, defaultOffset],
  )
  const [edge, setEdge] = useState<RailDockEdge>(initial.edge)
  const [offset, setOffset] = useState(initial.offset)
  const [SnapDock, setSnapDock] = useState<SnapDockLike | null>(null)

  useEffect(() => {
    let active = true
    import('react-driftkit')
      .then((mod) => {
        if (active && mod.SnapDock) setSnapDock(() => mod.SnapDock as SnapDockLike)
      })
      .catch(() => {
        /* static fallback */
      })
    return () => {
      active = false
    }
  }, [])

  const persist = useCallback(
    (nextEdge: RailDockEdge, nextOffset: number) => {
      try {
        localStorage.setItem(storageKey, serializeRailDock({ edge: nextEdge, offset: nextOffset }))
      } catch {
        /* ignore */
      }
    },
    [storageKey],
  )

  const panelClass = ['audion-flow-float-panel', className].filter(Boolean).join(' ')
  const body = (
    <div className="audion-flow-float-panel-inner">
      {title ? (
        <div className="audion-flow-float-panel-drag" title="Verschieben — wie Navigation">
          {title}
        </div>
      ) : null}
      {children}
    </div>
  )

  if (!SnapDock) {
    return (
      <div
        className={`${panelClass} audion-flow-float-panel--static`}
        data-edge={edge}
        aria-label={ariaLabel ?? title}
      >
        {body}
      </div>
    )
  }

  return (
    <SnapDock
      className={panelClass}
      defaultEdge={initial.edge}
      defaultOffset={initial.offset}
      edgePadding={remToPx(1)}
      snap
      draggable
      onEdgeChange={(next) => {
        setEdge(next)
        persist(next, offset)
      }}
      onOffsetChange={(nextOffset) => {
        setOffset(nextOffset)
        persist(edge, nextOffset)
      }}
      style={{ zIndex: 35 }}
    >
      {body}
    </SnapDock>
  )
}
