'use client'

import { useRef, useState } from 'react'
import { Button } from '@msqdx/ui'
import { useT } from '../lib/user-prefs'

/** Shared DOCX picker for knowledge dossiers. */
export function KnowledgeDocxUploadButton({
  uploadUrl,
  disabled,
  onUploaded,
}: {
  uploadUrl: string
  disabled?: boolean
  onUploaded: (body: Record<string, unknown>) => void | Promise<void>
}) {
  const t = useT()
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onPick(files: FileList | null) {
    if (!files?.length) return
    const file = files[0]!
    if (!file.name.toLowerCase().endsWith('.docx')) {
      setError(t('knowledge.uploadInvalidType'))
      if (inputRef.current) inputRef.current.value = ''
      return
    }
    setBusy(true)
    setError(null)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch(uploadUrl, { method: 'POST', body: form })
      const body = (await res.json().catch(() => null)) as Record<string, unknown> | null
      if (!res.ok) {
        throw new Error(
          (typeof body?.error === 'string' && body.error) || t('knowledge.uploadFailed'),
        )
      }
      await onUploaded(body ?? {})
    } catch (e) {
      setError(e instanceof Error ? e.message : t('knowledge.uploadFailed'))
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="audion-knowledge-upload">
      <input
        ref={inputRef}
        type="file"
        accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="audion-chat-attach-input"
        aria-hidden
        tabIndex={-1}
        onChange={(ev) => void onPick(ev.target.files)}
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={disabled || busy}
        aria-label={t('knowledge.uploadDocx')}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? t('knowledge.uploading') : t('knowledge.uploadDocx')}
      </Button>
      {error ? <p className="audion-project-knowledge-error">{error}</p> : null}
    </div>
  )
}
