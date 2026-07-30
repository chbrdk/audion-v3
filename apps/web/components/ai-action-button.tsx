'use client'

import React from 'react'
import { Button } from '@msqdx/ui'
import { IconSparkle } from './nav-icons'

/** Magazine AI CTA — sparkle + loading; title carries upstream target hint. */
export function AiActionButton({
  label,
  targetHint,
  loading = false,
  disabled = false,
  size = 'sm',
  variant = 'ghost',
  onClick,
  className,
}: {
  label: string
  /** Abbreviated stub target for title attribute */
  targetHint?: string
  loading?: boolean
  disabled?: boolean
  size?: 'sm' | 'md'
  variant?: 'ghost' | 'subtle' | 'primary'
  onClick: () => void
  className?: string
}) {
  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      className={className}
      disabled={disabled || loading}
      aria-label={label}
      title={targetHint ? `${label} · ${targetHint}` : label}
      icon={<IconSparkle size={14} />}
      onClick={onClick}
    >
      {loading ? 'Working…' : label}
    </Button>
  )
}
