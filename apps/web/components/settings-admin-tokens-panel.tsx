'use client'

import React, { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import type {
  SettingsApiTokenCreateResponse,
  SettingsApiTokenListResponse,
  SettingsApiTokenSummary,
} from '@audion-v3/contracts'
import { Alert, Button, Field, Hint, Input, Panel, Text } from '@msqdx/ui'
import { paths } from '../lib/paths'

export function SettingsAdminTokensPanel() {
  const [items, setItems] = useState<SettingsApiTokenSummary[]>([])
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newToken, setNewToken] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const reload = useCallback(async () => {
    const res = await fetch(paths.routes.apiSettingsTokens)
    if (!res.ok) throw new Error(`Failed to load tokens (${res.status})`)
    const json = (await res.json()) as SettingsApiTokenListResponse
    setItems(json.items)
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        await reload()
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load tokens')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [reload])

  async function onCreate() {
    setCreating(true)
    setError(null)
    setCopied(false)
    try {
      const res = await fetch(paths.routes.apiSettingsTokens, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() || undefined }),
      })
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(err?.error || `Create failed (${res.status})`)
      }
      const json = (await res.json()) as SettingsApiTokenCreateResponse
      setNewToken(json.token)
      setName('')
      await reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create failed')
    } finally {
      setCreating(false)
    }
  }

  async function onRevoke(id: string) {
    if (!window.confirm('Revoke this API token? Scripts using it will stop working.')) return
    setError(null)
    try {
      const res = await fetch(paths.routes.apiSettingsTokenDetail(id), { method: 'DELETE' })
      if (!res.ok && res.status !== 204) {
        const err = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(err?.error || `Revoke failed (${res.status})`)
      }
      if (newToken) setNewToken(null)
      await reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Revoke failed')
    }
  }

  async function onCopy() {
    if (!newToken) return
    try {
      await navigator.clipboard.writeText(newToken)
      setCopied(true)
    } catch {
      setError('Could not copy to clipboard')
    }
  }

  return (
    <div className="audion-stack" data-testid="settings-admin-tokens">
      <p>
        <Link href={paths.routes.settingsAdmin} className="audion-link">
          ← Admin
        </Link>
      </p>
      <Hint panel>
        Personal Bearer tokens for MCP and integrations. The secret is shown once after create —
        store it safely. Fixture-backed until product Postgres.
      </Hint>
      {error ? <Alert tone="error">{error}</Alert> : null}
      {newToken ? (
        <Panel className="audion-stack" data-testid="settings-admin-token-new">
          <Text role="headline" as="h3">
            New token
          </Text>
          <Text role="meta">Copy now — it will not be shown again.</Text>
          <code
            data-testid="settings-admin-token-secret"
            style={{
              display: 'block',
              padding: '0.75rem',
              wordBreak: 'break-all',
              fontSize: '0.85rem',
              background: 'var(--msqdx-color-bg-subtle, #f4f4f4)',
              borderRadius: 4,
            }}
          >
            {newToken}
          </code>
          <div className="audion-row" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
            <Button type="button" onClick={onCopy} data-testid="settings-admin-token-copy">
              {copied ? 'Copied' : 'Copy'}
            </Button>
            <Button
              type="button"
              variant="subtle"
              onClick={() => setNewToken(null)}
              data-testid="settings-admin-token-dismiss"
            >
              Dismiss
            </Button>
          </div>
        </Panel>
      ) : (
        <Panel className="audion-stack">
          <Field label="Label (optional)">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="MCP local"
              data-testid="settings-admin-token-name"
            />
          </Field>
          <Button
            type="button"
            onClick={onCreate}
            disabled={creating}
            data-testid="settings-admin-token-create"
          >
            {creating ? 'Creating…' : 'Create token'}
          </Button>
        </Panel>
      )}
      <Panel className="audion-stack" data-testid="settings-admin-token-list">
        <Text role="headline" as="h3">
          Tokens
        </Text>
        {loading ? <Text role="meta">Loading…</Text> : null}
        {!loading && items.length === 0 ? (
          <Text role="meta">No tokens yet.</Text>
        ) : null}
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {items.map((t) => (
            <li
              key={t.id}
              data-testid={`settings-admin-token-row-${t.id}`}
              style={{
                display: 'flex',
                gap: '0.75rem',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.5rem 0',
                borderBottom: '1px solid var(--msqdx-color-border, #ddd)',
              }}
            >
              <div>
                <Text as="span">{t.name || 'Untitled token'}</Text>
                <Text role="meta" as="div">
                  {t.createdAt}
                </Text>
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => void onRevoke(t.id)}
                data-testid={`settings-admin-token-revoke-${t.id}`}
              >
                Revoke
              </Button>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  )
}
