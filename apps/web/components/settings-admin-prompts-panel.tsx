'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import type {
  SettingsAssistPromptTestResponse,
  SettingsAssistTemplateSummary,
  SettingsAssistTemplatesResponse,
} from '@audion-v3/contracts'
import { Alert, Button, Field, Hint, Input, Panel, Text, Textarea } from '@msqdx/ui'
import { Select } from '../lib/msqdx-ui-client'
import { paths } from '../lib/paths'

export function SettingsAdminPromptsPanel() {
  const [templates, setTemplates] = useState<SettingsAssistTemplateSummary[]>([])
  const [templateId, setTemplateId] = useState('')
  const [locale, setLocale] = useState('en')
  const [context, setContext] = useState('')
  const [profile, setProfile] = useState('')
  const [system, setSystem] = useState('')
  const [prompt, setPrompt] = useState('')
  const [loadingList, setLoadingList] = useState(true)
  const [testing, setTesting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<SettingsAssistPromptTestResponse | null>(null)

  function applyTemplate(t: SettingsAssistTemplateSummary | undefined) {
    if (!t) return
    setTemplateId(t.id)
    setSystem(t.system)
    setPrompt(t.prompt || t.user)
  }

  async function reloadList(preferId?: string) {
    const res = await fetch(paths.routes.apiSettingsPrompts)
    if (!res.ok) throw new Error(`Failed to load templates (${res.status})`)
    const json = (await res.json()) as SettingsAssistTemplatesResponse
    setTemplates(json.templates)
    const nextId = preferId || templateId || json.templates[0]?.id || ''
    const selected = json.templates.find((t) => t.id === nextId) ?? json.templates[0]
    applyTemplate(selected)
    return json.templates
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        await reloadList()
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load templates')
      } finally {
        if (!cancelled) setLoadingList(false)
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only load
  }, [])

  function onSelectTemplate(id: string) {
    const t = templates.find((row) => row.id === id)
    applyTemplate(t)
    setResult(null)
    setError(null)
  }

  async function onSave() {
    if (!templateId) {
      setError('Select a template')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(paths.routes.apiSettingsPromptDetail(templateId), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system, prompt }),
      })
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(err?.error || `Save failed (${res.status})`)
      }
      await reloadList(templateId)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function onReset() {
    if (!templateId) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(paths.routes.apiSettingsPromptDetail(templateId), {
        method: 'DELETE',
      })
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(err?.error || `Reset failed (${res.status})`)
      }
      await reloadList(templateId)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Reset failed')
    } finally {
      setSaving(false)
    }
  }

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

  const selected = templates.find((t) => t.id === templateId)

  return (
    <div className="audion-stack" data-testid="settings-admin-prompts">
      <p>
        <Link href={paths.routes.settingsAdmin} className="audion-link">
          ← Admin
        </Link>
      </p>
      <Hint panel>
        Ported V2 assist templates with dollar-brace variable substitution. Edit + save writes a
        global fixture override; reset restores the catalog. Test stubs when AI runtime is not
        native.
      </Hint>
      {loadingList ? <Text role="meta">Loading templates…</Text> : null}
      {!loadingList ? (
        <Panel className="audion-stack">
          <Field label="Template">
            <Select
              value={templateId}
              onChange={(value) => onSelectTemplate(String(value))}
              options={templates.map((t) => ({
                value: t.id,
                label: `${t.id}${t.overridden ? ' • overridden' : ''}${t.json ? ' (JSON)' : ''}`,
              }))}
              aria-label="Assist template"
              data-testid="settings-admin-template"
            />
          </Field>
          {selected ? (
            <Text role="meta">
              {selected.label} · {selected.category}
              {selected.overridden ? ' · overridden' : ''}
            </Text>
          ) : null}
          <Field label="System">
            <Textarea
              value={system}
              onChange={(e) => setSystem(e.target.value)}
              rows={3}
              data-testid="settings-admin-system"
            />
          </Field>
          <Field label="Prompt body">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={12}
              data-testid="settings-admin-prompt-body"
            />
          </Field>
          <div className="audion-row" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
            <Button
              type="button"
              onClick={onSave}
              disabled={saving || !templateId}
              data-testid="settings-admin-prompt-save"
            >
              {saving ? 'Saving…' : 'Save override'}
            </Button>
            <Button
              type="button"
              variant="subtle"
              onClick={onReset}
              disabled={saving || !templateId || !selected?.overridden}
              data-testid="settings-admin-prompt-reset"
            >
              Reset
            </Button>
          </div>
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
