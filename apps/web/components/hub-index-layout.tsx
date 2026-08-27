'use client'

import { useEffect, useState } from 'react'
import { paths } from '../lib/paths'
import { useT } from '../lib/user-prefs'

export type HubIndexLayout = 'cards' | 'list'

export function readHubIndexLayout(): HubIndexLayout {
  if (typeof window === 'undefined') return 'cards'
  try {
    const raw = window.sessionStorage.getItem(paths.hubIndexLayoutKey)
    return raw === 'list' ? 'list' : 'cards'
  } catch {
    return 'cards'
  }
}

export function writeHubIndexLayout(next: HubIndexLayout): void {
  try {
    window.sessionStorage.setItem(paths.hubIndexLayoutKey, next)
  } catch {
    /* ignore */
  }
}

/** Shared cards/list preference for personas, projects, TGs, journeys hubs. */
export function useHubIndexLayout(): {
  layout: HubIndexLayout
  setLayout: (next: HubIndexLayout) => void
} {
  const [layout, setLayoutState] = useState<HubIndexLayout>('cards')

  useEffect(() => {
    setLayoutState(readHubIndexLayout())
  }, [])

  function setLayout(next: HubIndexLayout) {
    setLayoutState(next)
    writeHubIndexLayout(next)
  }

  return { layout, setLayout }
}

export function HubIndexLayoutSwitch({
  layout,
  onChange,
}: {
  layout: HubIndexLayout
  onChange: (next: HubIndexLayout) => void
}) {
  const t = useT()
  return (
    <div
      className="audion-editable-comm-layout-switch"
      role="group"
      aria-label={t('lists.layoutAria')}
    >
      <button
        type="button"
        className={layout === 'cards' ? 'is-active' : undefined}
        aria-pressed={layout === 'cards'}
        onClick={() => onChange('cards')}
      >
        {t('lists.layoutCards')}
      </button>
      <button
        type="button"
        className={layout === 'list' ? 'is-active' : undefined}
        aria-pressed={layout === 'list'}
        onClick={() => onChange('list')}
      >
        {t('lists.layoutList')}
      </button>
    </div>
  )
}
