'use client'

import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { Button, EmptyState, Panel, SectionChrome } from '@msqdx/ui'
import {
  CHANNEL_PICKER_GROUP_LABELS,
  CHANNEL_PICKER_OPTIONS,
  ChannelIcon,
  type ChannelIconKey,
  type ChannelPickerGroup,
  channelLabelForKey,
} from '../lib/channel-icons'
import { Dialog } from '../lib/msqdx-ui-client'
import { paths } from '../lib/paths'
import { useT } from '../lib/user-prefs'
import { IconDelete } from './nav-icons'

type MenuState =
  | { mode: 'add'; anchor: DOMRect }
  | { mode: 'edit'; index: number; anchor: DOMRect }

type Props = {
  personaId: string
  channels: string[]
  className?: string
}

function menuPosition(anchor: DOMRect): { top: number; left: number } {
  const width = 320
  const gap = 8
  const left = Math.min(
    Math.max(12, anchor.left + anchor.width / 2 - width / 2),
    window.innerWidth - width - 12,
  )
  const preferredTop = anchor.bottom + gap
  const maxTop = Math.max(12, window.innerHeight - 420)
  const top = Math.min(preferredTop, maxTop)
  return { top, left }
}

const PICKER_GROUPS: ChannelPickerGroup[] = ['social', 'messaging', 'work']

export function PersonaChannelBubbles({ personaId, channels, className }: Props) {
  const t = useT()
  const router = useRouter()
  const menuId = useId()
  const menuRef = useRef<HTMLDivElement | null>(null)
  const ignoreDismissUntil = useRef(0)
  const [mounted, setMounted] = useState(false)
  const [localChannels, setLocalChannels] = useState(channels)
  const [menu, setMenu] = useState<MenuState | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    setLocalChannels(channels)
    setError(null)
  }, [channels, personaId])

  useLayoutEffect(() => {
    if (!menu) return

    function onPointerDown(event: PointerEvent) {
      if (Date.now() < ignoreDismissUntil.current) return
      const target = event.target as Node | null
      if (target && menuRef.current?.contains(target)) return
      setMenu(null)
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenu(null)
    }

    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [menu])

  async function persist(next: string[]) {
    setSaving(true)
    setError(null)
    try {
      const response = await fetch(paths.routes.apiPersonaDetail(personaId), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channels: next }),
      })
      if (!response.ok) {
        const err = (await response.json().catch(() => null)) as { error?: string } | null
        throw new Error(err?.error || `Save failed (${response.status})`)
      }
      setLocalChannels(next)
      router.refresh()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
      return false
    } finally {
      setSaving(false)
    }
  }

  function openMenu(next: MenuState) {
    if (saving) return
    ignoreDismissUntil.current = Date.now() + 250
    setMenu(next)
  }

  function openAddMenu(el: HTMLElement) {
    openMenu({ mode: 'add', anchor: el.getBoundingClientRect() })
  }

  function openEditMenu(index: number, el: HTMLElement) {
    openMenu({ mode: 'edit', index, anchor: el.getBoundingClientRect() })
  }

  async function onPick(key: ChannelIconKey) {
    if (!menu) return
    const label = channelLabelForKey(key)
    const next =
      menu.mode === 'add'
        ? localChannels.some((c) => c.toLowerCase() === label.toLowerCase())
          ? localChannels
          : [...localChannels, label]
        : localChannels.map((item, i) => (i === menu.index ? label : item))
    const ok = await persist(next)
    if (ok) setMenu(null)
  }

  async function onConfirmDelete() {
    if (deleteIndex == null) return
    const next = localChannels.filter((_, i) => i !== deleteIndex)
    const ok = await persist(next)
    if (ok) {
      setDeleteIndex(null)
      setMenu(null)
    }
  }

  const selectedLabel = menu?.mode === 'edit' ? localChannels[menu.index] : null
  const deleteLabel = deleteIndex != null ? localChannels[deleteIndex] : ''
  const coords = menu ? menuPosition(menu.anchor) : null

  const picker =
    mounted && menu && coords
      ? createPortal(
          <div
            ref={menuRef}
            id={menuId}
            className="audion-channel-picker"
            role="menu"
            aria-label={menu.mode === 'add' ? t('personaEdit.addChannel') : t('personaEdit.changeChannel')}
            style={{ top: coords.top, left: coords.left }}
          >
            <p className="audion-channel-picker-title">
              {menu.mode === 'add' ? t('personaEdit.addChannel') : t('personaEdit.changeChannel')}
            </p>
            <div className="audion-channel-picker-body">
              {PICKER_GROUPS.map((group) => {
                const options = CHANNEL_PICKER_OPTIONS.filter((o) => o.group === group)
                if (!options.length) return null
                return (
                  <div key={group} className="audion-channel-picker-section">
                    <p className="audion-channel-picker-group">{CHANNEL_PICKER_GROUP_LABELS[group]}</p>
                    <div className="audion-channel-picker-grid">
                      {options.map((option) => {
                        const taken =
                          menu.mode === 'add' &&
                          localChannels.some((c) => c.toLowerCase() === option.label.toLowerCase())
                        const isSelected =
                          selectedLabel != null &&
                          selectedLabel.toLowerCase() === option.label.toLowerCase()
                        return (
                          <button
                            key={option.key}
                            type="button"
                            role="menuitem"
                            className={[
                              'audion-channel-picker-item',
                              isSelected ? 'audion-channel-picker-item--selected' : '',
                            ]
                              .filter(Boolean)
                              .join(' ')}
                            title={option.label}
                            aria-label={option.label}
                            disabled={saving || taken}
                            onClick={() => void onPick(option.key)}
                          >
                            <span className="audion-channel-bubble audion-channel-bubble--picker">
                              <ChannelIcon channel={option.label} />
                            </span>
                            <span className="audion-channel-picker-label">{option.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
            {menu.mode === 'edit' ? (
              <button
                type="button"
                role="menuitem"
                className="audion-channel-picker-delete"
                disabled={saving}
                onClick={() => {
                  setDeleteIndex(menu.index)
                  setMenu(null)
                }}
              >
                <IconDelete />
                {t('common.remove')}
              </button>
            ) : null}
          </div>,
          document.body,
        )
      : null

  return (
    <Panel
      className={[
        'stage-panel',
        'audion-magazine-band',
        'audion-magazine-channels',
        'audion-channel-editor',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <SectionChrome
        quiet
        title={t('personaEdit.channels')}
        meta={`${localChannels.length}`}
        as="h3"
        action={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="audion-channel-add-btn"
            aria-label={t('personaEdit.addChannel')}
            title={t('personaEdit.addChannel')}
            disabled={saving}
            onClick={(e) => openAddMenu(e.currentTarget)}
          >
            +
          </Button>
        }
      />

      {localChannels.length ? (
        <ul className="audion-channel-bubbles" aria-label={t('personaEdit.channels')}>
          {localChannels.map((channel, index) => (
            <li key={`${channel}-${index}`}>
              <button
                type="button"
                data-channel-bubble
                className="audion-channel-bubble"
                title={`${channel} — click to change`}
                aria-label={channel}
                aria-haspopup="menu"
                aria-expanded={menu?.mode === 'edit' && menu.index === index}
                disabled={saving}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  openEditMenu(index, e.currentTarget)
                }}
                onContextMenu={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  openEditMenu(index, e.currentTarget)
                }}
              >
                <ChannelIcon channel={channel} />
              </button>
            </li>
          ))}
          <li>
            <button
              type="button"
              data-channel-bubble
              className="audion-channel-bubble audion-channel-bubble--add"
              aria-label={t('personaEdit.addChannel')}
              title={t('personaEdit.addChannel')}
              disabled={saving}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                openAddMenu(e.currentTarget)
              }}
              onContextMenu={(e) => {
                e.preventDefault()
                e.stopPropagation()
                openAddMenu(e.currentTarget)
              }}
            >
              +
            </button>
          </li>
        </ul>
      ) : (
        <EmptyState>
          {t('personaEdit.noChannels')}{' '}
          <button
            type="button"
            className="audion-link"
            disabled={saving}
            onClick={(e) => openAddMenu(e.currentTarget)}
          >
            {t('personaEdit.addChannel')}
          </button>
        </EmptyState>
      )}

      {error ? (
        <p className="audion-editable-list-error" role="alert">
          {error}
        </p>
      ) : null}

      {picker}

      {deleteIndex != null ? (
        <Dialog
          open
          onClose={() => {
            if (!saving) setDeleteIndex(null)
          }}
          className="audion-edit-dialog"
          title={t('personaEdit.deleteChannelConfirm')}
          actions={
            <>
              <Button variant="ghost" size="md" onClick={() => setDeleteIndex(null)} disabled={saving}>
                {t('common.cancel')}
              </Button>
              <Button size="md" onClick={() => void onConfirmDelete()} disabled={saving}>
                {saving ? t('common.deleting') : t('common.delete')}
              </Button>
            </>
          }
        >
          <p>{t('personaEdit.removeChannelConfirm', { name: deleteLabel })}</p>
        </Dialog>
      ) : null}
    </Panel>
  )
}
