'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { Alert, Hint, Panel, Text } from '@msqdx/ui'
import { paths } from '../lib/paths'

/** Curated Next BFF routes — no OpenAPI in v3. */
const API_CATALOG: Array<{ group: string; routes: Array<{ method: string; path: string; note: string }> }> =
  [
    {
      group: 'Health',
      routes: [{ method: 'GET', path: paths.routes.apiHealth, note: 'Coolify / runtime probe' }],
    },
    {
      group: 'Settings admin',
      routes: [
        { method: 'GET', path: paths.routes.apiSettingsProviders, note: 'Provider status' },
        { method: 'GET', path: paths.routes.apiSettingsPrompts, note: 'Assist template list' },
        {
          method: 'PUT',
          path: paths.routes.apiSettingsPromptDetail('{id}'),
          note: 'Upsert assist template override',
        },
        {
          method: 'DELETE',
          path: paths.routes.apiSettingsPromptDetail('{id}'),
          note: 'Reset assist template override',
        },
        { method: 'POST', path: paths.routes.apiSettingsPromptTest, note: 'Assist prompt test' },
        { method: 'GET', path: paths.routes.apiSettingsTokens, note: 'List API tokens' },
        { method: 'POST', path: paths.routes.apiSettingsTokens, note: 'Create API token' },
        {
          method: 'DELETE',
          path: paths.routes.apiSettingsTokenDetail('{id}'),
          note: 'Revoke API token',
        },
        {
          method: 'POST',
          path: paths.routes.apiSettingsTokenVerify,
          note: 'Verify Bearer API token',
        },
      ],
    },
    {
      group: 'Queue',
      routes: [
        { method: 'GET', path: paths.routes.apiQueueStats, note: 'Job status counts' },
        { method: 'GET', path: paths.routes.apiQueueJobs, note: 'Job list' },
        { method: 'POST', path: paths.routes.apiQueueJobRetry('…'), note: 'Retry failed job' },
      ],
    },
    {
      group: 'Projects',
      routes: [
        { method: 'POST', path: paths.routes.apiProjects, note: 'Create project' },
        { method: 'POST', path: paths.routes.apiProjectsBootstrap, note: 'Easy Setup bootstrap' },
      ],
    },
    {
      group: 'Domain',
      routes: [
        { method: 'GET', path: paths.routes.apiPersonas, note: 'Persona list' },
        { method: 'GET', path: paths.routes.apiTargetGroups, note: 'Target group list' },
        { method: 'GET', path: paths.routes.apiJourneys, note: 'Journey list' },
        { method: 'GET', path: paths.routes.apiStudies, note: 'UX studies list' },
      ],
    },
    {
      group: 'AI / Chat',
      routes: [
        { method: 'GET', path: paths.routes.apiAiOptions, note: 'AI dialog picker options' },
        { method: 'POST', path: paths.routes.apiChatStream, note: 'Chat NDJSON stream' },
      ],
    },
  ]

export function SettingsAdminApiDocsPanel() {
  const [health, setHealth] = useState<unknown>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(paths.routes.apiHealth)
        if (!res.ok) throw new Error(`Health failed (${res.status})`)
        const json = await res.json()
        if (!cancelled) setHealth(json)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Health fetch failed')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="audion-stack" data-testid="settings-admin-api-docs">
      <p>
        <Link href={paths.routes.settingsAdmin} className="audion-link">
          ← Admin
        </Link>
      </p>
      <Hint panel>
        V3 has no OpenAPI iframe. This catalog lists the main Next BFF routes from{' '}
        <code>paths.routes</code>.
      </Hint>

      <Panel className="audion-stack">
        <Text role="headline" as="h3">
          Live health
        </Text>
        <p>
          <a
            href={paths.routes.apiHealth}
            target="_blank"
            rel="noreferrer"
            className="audion-link"
            data-testid="settings-admin-health-link"
          >
            Open {paths.routes.apiHealth}
          </a>
        </p>
        {error ? <Alert tone="error">{error}</Alert> : null}
        {health ? (
          <pre
            data-testid="settings-admin-health-json"
            style={{
              margin: 0,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontSize: '0.85rem',
            }}
          >
            {JSON.stringify(health, null, 2)}
          </pre>
        ) : !error ? (
          <Text role="meta">Loading health…</Text>
        ) : null}
      </Panel>

      {API_CATALOG.map((section) => (
        <Panel key={section.group} className="audion-stack">
          <Text role="headline" as="h3">
            {section.group}
          </Text>
          <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
            {section.routes.map((r) => (
              <li key={`${r.method}-${r.path}`}>
                <Text role="body">
                  <code>
                    {r.method} {r.path}
                  </code>
                  {' — '}
                  {r.note}
                </Text>
              </li>
            ))}
          </ul>
        </Panel>
      ))}
    </div>
  )
}
