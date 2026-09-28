'use client'

import React, { useEffect, useState } from 'react'
import type { VideoAvatarCatalogItem, VideoAvatarCatalogResponse } from '@audion-v3/contracts'
import { Button } from '@msqdx/ui'
import { useT } from '../lib/user-prefs'

type Props = {
  catalogUrl: string
  selectedId: string | null
  onSelect: (id: string | null) => void
  ariaLabel: string
  disabled?: boolean
}

export function VideoAvatarPicker({
  catalogUrl,
  selectedId,
  onSelect,
  ariaLabel,
  disabled = false,
}: Props) {
  const t = useT()
  const [items, setItems] = useState<VideoAvatarCatalogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [configured, setConfigured] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    void (async () => {
      try {
        const response = await fetch(catalogUrl, { cache: 'no-store' })
        const body = (await response.json().catch(() => null)) as
          | (VideoAvatarCatalogResponse & { error?: string })
          | null
        if (cancelled) return
        if (!response.ok) {
          setConfigured(body?.configured !== false)
          setItems(Array.isArray(body?.items) ? body.items : [])
          setError(body?.error || `Load failed (${response.status})`)
          return
        }
        setConfigured(body?.configured !== false)
        setItems(Array.isArray(body?.items) ? body.items : [])
        setError(null)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Load failed')
          setItems([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [catalogUrl])

  const selected = (selectedId ?? '').trim()

  return (
    <div className="audion-video-avatar-picker" role="group" aria-label={ariaLabel}>
      {loading ? (
        <p className="audion-video-avatar-picker__status">{t('personaEdit.avatarCatalogLoading')}</p>
      ) : null}
      {!loading && error ? (
        <p className="audion-edit-error" role="alert">
          {configured === false ? t('personaEdit.avatarCatalogUnavailable') : error}
        </p>
      ) : null}
      {!loading && !error && items.length === 0 ? (
        <p className="audion-video-avatar-picker__status">{t('personaEdit.avatarCatalogEmpty')}</p>
      ) : null}
      {items.length > 0 ? (
        <ul className="audion-video-avatar-picker__grid">
          {items.map((item) => {
            const isSelected = selected === item.id
            return (
              <li key={item.id}>
                <button
                  type="button"
                  className={[
                    'audion-video-avatar-picker__tile',
                    isSelected ? 'is-selected' : null,
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  disabled={disabled}
                  aria-pressed={isSelected}
                  onClick={() => onSelect(isSelected ? null : item.id)}
                >
                  {item.previewUrl ? (
                    // Provider CDN thumbs; keys stay server-side.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.previewUrl} alt="" loading="lazy" />
                  ) : (
                    <span className="audion-video-avatar-picker__placeholder" aria-hidden>
                      {item.name.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <span className="audion-video-avatar-picker__name">{item.name}</span>
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}
      {selected ? (
        <div className="audion-video-avatar-picker__actions">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled}
            onClick={() => onSelect(null)}
          >
            {t('personaEdit.clearAvatarSelection')}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
