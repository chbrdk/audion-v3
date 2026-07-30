import React from 'react'

export function SnapDock({
  children,
  className,
}: {
  children?: React.ReactNode
  className?: string
}) {
  return (
    <nav className={className} aria-label="Primary">
      {children}
    </nav>
  )
}
