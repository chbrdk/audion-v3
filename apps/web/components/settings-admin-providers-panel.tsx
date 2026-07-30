'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import type { SettingsProvidersResponse } from '@audion-v3/contracts'
import { Alert, Hint, Panel, Text } from '@msqdx/ui'
import { paths } from '../lib/paths'

export function SettingsAdminProvidersPanel() {
  const [data, setData] = useState<SettingsProvidersResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(paths.routes.apiSettingsProviders)
        if (!res.ok) throw new Error(`Failed to load providers (${res.status})`)
        const json = (await res.json()) as SettingsProvidersResponse
        if (!cancelled) setData(json)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="audion-stack" data-testid="settings-admin-providers">
      <p>
        <Link href={paths.routes.settingsAdmin} className="audion-link">
          ← Admin
        </Link>
      </p>
      <Hint panel>Read-only status from server env. Keys are never shown.</Hint>
      {error ? <Alert tone="error">{error}</Alert> : null}
      {data ? (
        <>
          <Panel className="audion-stack">
            <Text role="meta">
              Runtime: {data.aiRuntime} · Chat native: {data.chatNative ? 'yes' : 'no'} · Data:{' '}
              {data.personaDataSource} · Plexon: {data.plexonConfigured ? 'configured' : 'off'}
            </Text>
          </Panel>
          <ul className="audion-tg-grid" style={{ listStyle: 'none', padding: 0 }}>
            {data.providers.map((p) => (
              <li key={p.id}>
                <Panel className="audion-stack">
                  <Text role="headline" as="h3">
                    {p.label}
                  </Text>
                  <Text role="meta">
                    {p.model ? `Model: ${p.model} · ` : ''}
                    {p.configured ? 'Connected' : 'Missing'}
                    {data.defaultProvider === p.id ? ' · Default' : ''}
                  </Text>
                  {p.detail ? <Text role="body">{p.detail}</Text> : null}
                </Panel>
              </li>
            ))}
          </ul>
        </>
      ) : !error ? (
        <Text role="meta">Loading…</Text>
      ) : null}
    </div>
  )
}
