'use client'

import React, { useEffect, useState } from 'react'
import type { VideoAvatarCatalogItem, VideoAvatarCatalogResponse } from '@audion-v3/contracts'
import { Button } from '@msqdx/ui'
import { paths } from '../lib/paths'
import { useT } from '../lib/user-prefs'

type Props = {
  catalogUrl: string
  selectedId: string | null
  onSelect: (id: string | null) => void
  ariaLabel: string
  disabled?: boolean
}

function pageForSelectedId(items: VideoAvatarCatalogItem[], selectedId: string, pageSize: number): number {
  const index = items.findIndex((item) => item.id === selectedId)
  if (index < 0) return 0
  return Math.floor(index / pageSize)
}

export function VideoAvatarPicker({
  catalogUrl,
  selectedId,
  onSelect,
  ariaLabel,
  disabled = false,
}: Props) {
  const t = useT()
  const pageSize = paths.videoAvatarPickerPageSize
  const [items, setItems] = useState<VideoAvatarCatalogItem[]>([])
  const [page, setPage] = useState(0)
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
        const nextItems = Array.isArray(body?.items) ? body.items : []
        if (!response.ok) {
          setConfigured(body?.configured !== false)
          setItems(nextItems)
          setPage(0)
          setError(body?.error || `Load failed (${response.status})`)
          return
        }
        setConfigured(body?.configured !== false)
        setItems(nextItems)
        const selected = (selectedId ?? '').trim()
        setPage(selected ? pageForSelectedId(nextItems, selected, pageSize) : 0)
        setError(null)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Load failed')
          setItems([])
          setPage(0)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
    // selectedId only seeds the initial page after load; pager owns page thereafter.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- avoid refetch on select
  }, [catalogUrl, pageSize])

  useEffect(() => {
    const selected = (selectedId ?? '').trim()
    if (!selected || items.length === 0) return
    setPage(pageForSelectedId(items, selected, pageSize))
  }, [selectedId, items, pageSize])

  const selected = (selectedId ?? '').trim()
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize))
  const safePage = Math.min(page, pageCount - 1)
  const visible = items.slice(safePage * pageSize, safePage * pageSize + pageSize)
  const showPager = items.length > pageSize

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
      {visible.length > 0 ? (
        <ul className="audion-video-avatar-picker__grid">
          {visible.map((item) => {
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
                    item.previewKind === 'video' ? (
                      <video
                        className="audion-video-avatar-picker__media"
                        src={item.previewUrl}
                        muted
                        autoPlay
                        loop
                        playsInline
                        preload="metadata"
                        aria-hidden
                      />
                    ) : (
                      // Provider CDN thumbs; keys stay server-side.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        className="audion-video-avatar-picker__media"
                        src={item.previewUrl}
                        alt=""
                        loading="lazy"
                      />
                    )
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
      {showPager ? (
        <div className="audion-video-avatar-picker__pager">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled || safePage <= 0}
            aria-label={t('personaEdit.avatarCatalogPrev')}
            onClick={() => setPage((current) => Math.max(0, current - 1))}
          >
            {t('personaEdit.avatarCatalogPrev')}
          </Button>
          <span className="audion-video-avatar-picker__page" aria-live="polite">
            {t('personaEdit.avatarCatalogPage', {
              page: String(safePage + 1),
              pages: String(pageCount),
            })}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled || safePage >= pageCount - 1}
            aria-label={t('personaEdit.avatarCatalogNext')}
            onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))}
          >
            {t('personaEdit.avatarCatalogNext')}
          </Button>
        </div>
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
