'use client'

import React, { useRef, useState } from 'react'
import { VARIABLE_MIME } from './VariablePalette'

type Props = {
  value: string
  onChange: (next: string) => void
  placeholder?: string
  rows?: number
  testId?: string
}

export function PromptEditor({
  value,
  onChange,
  placeholder = 'Enter prompt…',
  rows = 18,
  testId = 'pb-editor',
}: Props) {
  const ref = useRef<HTMLTextAreaElement | null>(null)
  const [dragOver, setDragOver] = useState(false)

  function insertAtCursor(syntax: string) {
    const el = ref.current
    if (!el) {
      onChange(value + syntax)
      return
    }
    const start = el.selectionStart ?? value.length
    const end = el.selectionEnd ?? value.length
    const next = value.slice(0, start) + syntax + value.slice(end)
    onChange(next)
    requestAnimationFrame(() => {
      el.focus()
      const pos = start + syntax.length
      el.setSelectionRange(pos, pos)
    })
  }

  return (
    <div
      className={`pb-editor ${dragOver ? 'pb-editor--drag' : ''}`}
      onDragOver={(e) => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragOver(false)
        const syntax = e.dataTransfer.getData(VARIABLE_MIME)
        if (syntax) insertAtCursor(syntax)
      }}
    >
      <textarea
        ref={ref}
        className="ds-textarea ds-input ds-textarea--sm ds-input--sm pb-editor__textarea"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        data-testid={testId}
      />
    </div>
  )
}
