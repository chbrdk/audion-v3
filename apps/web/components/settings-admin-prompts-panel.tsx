'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import type {
  SettingsAssistPromptTestResponse,
  SettingsAssistTemplatesResponse,
} from '@audion-v3/contracts'
import { Alert, Button, Field, Hint, Input, Panel, Text, Textarea } from '@msqdx/ui'
import { Select } from '../lib/msqdx-ui-client'
import { paths } from '../lib/paths'

export function SettingsAdminPromptsPanel() {
  const [templates, setTemplates] = useState<SettingsAssistTemplatesResponse['templates']>([])
  const [templateId, setTemplateId] = useState('')
  const [locale, setLocale] = useState('en')
  const [context, setContext] = useState('')
  const [profile, setProfile] = useState('')
  const [loadingList, setLoadingList] = useState(true)
  const [testing, setTesting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<SettingsAssistPromptTestResponse | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(paths.routes.apiSettingsPrompts)
        if (!res.ok) throw new Error(`Failed to load templates (${res.status})`)
        const json = (await res.json()) as SettingsAssistTemplatesResponse
        if (!cancelled) {
          setTemplates(json.templates)
          if (json.templates[0]) setTemplateId(json.templates[0].id)
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load templates')
      } finally {
        if (!cancelled) setLoadingList(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  async function onTest() {
    if (!templateId) {
      setError('Select a template')
      return
    }
    setTesting(true)
    setError(null)
    setResult(null)
    try {
      const body: Record<string, string> = { templateId }
      if (locale.trim()) body.locale = locale.trim()
      if (context.trim()) body.context = context.trim()
      if (profile.trim()) body.persona_profile = profile.trim()
      const res = await fetch(paths.routes.apiSettingsPromptTest, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(err?.error || `Test failed (${res.status})`)
      }
      setResult((await res.json()) as SettingsAssistPromptTestResponse)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Test failed')
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="audion-stack" data-testid="settings-admin-prompts">
      <p>
        <Link href={paths.routes.settingsAdmin} className="audion-link">
          ← Admin
        </Link>
      </p>
      <Hint panel>
        Native assist templates are read-only. Test runs stub seeds when AI runtime does not prefer
        native OpenAI.
      </Hint>
      {loadingList ? <Text role="meta">Loading templates…</Text> : null}
      {!loadingList ? (
        <Panel className="audion-stack">
          <Field label="Template">
            <Select
              value={templateId}
              onChange={(value) => setTemplateId(String(value))}
              options={templates.map((t) => ({
                value: t.id,
                label: `${t.id}${t.json ? ' (JSON)' : ''}`,
              }))}
              aria-label="Assist template"
              data-testid="settings-admin-template"
            />
          </Field>
          <Field label="Locale">
            <Input
              value={locale}
              onChange={(e) => setLocale(e.target.value)}
              data-testid="settings-admin-locale"
            />
          </Field>
          <Field label="Context (optional)">
            <Textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              rows={3}
              data-testid="settings-admin-context"
            />
          </Field>
          <Field label="Persona profile (optional)">
            <Textarea
              value={profile}
              onChange={(e) => setProfile(e.target.value)}
              rows={3}
              data-testid="settings-admin-profile"
            />
          </Field>
          {error ? <Alert tone="error">{error}</Alert> : null}
          <Button
            type="button"
            onClick={onTest}
            disabled={testing || !templateId}
            data-testid="settings-admin-prompt-test"
          >
            {testing ? 'Testing…' : 'Test prompt'}
          </Button>
        </Panel>
      ) : null}
      {result ? (
        <Panel className="audion-stack" data-testid="settings-admin-prompt-result">
          <Text role="headline" as="h3">
            Result
          </Text>
          <Text role="meta">
            {result.stubbed ? 'Stubbed' : 'Native'} · {result.templateId}
          </Text>
          <pre
            style={{
              margin: 0,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontSize: '0.85rem',
            }}
          >
            {result.text || JSON.stringify(result.json ?? result.suggestions, null, 2)}
          </pre>
        </Panel>
      ) : null}
    </div>
  )
}
