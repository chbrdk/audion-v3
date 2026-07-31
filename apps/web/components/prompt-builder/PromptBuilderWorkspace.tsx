'use client'

import React, { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import type {
  SettingsAssistPromptTestResponse,
  SettingsAssistTemplateSummary,
  SettingsAssistTemplatesResponse,
  SettingsPersonaPromptDetail,
  SettingsPersonaPromptListResponse,
  SettingsPersonaPromptSummary,
} from '@audion-v3/contracts'
import {
  Accordion,
  Alert,
  Button,
  Chip,
  Field,
  Hint,
  Panel,
  Text,
  Textarea,
  ToggleGroup,
} from '@msqdx/ui'
import { paths } from '../../lib/paths'
import { ExecutionOutputPanel } from './ExecutionOutputPanel'
import { LivePreviewPanel } from './LivePreviewPanel'
import { PromptEditor } from './PromptEditor'
import { ResizablePanel } from './ResizablePanel'
import { TemplateRail, type CatalogKind } from './TemplateRail'
import { VariableContextPanel } from './VariableContextPanel'
import { VariablePalette } from './VariablePalette'
import './prompt-builder.css'

export function PromptBuilderWorkspace() {
  const [assist, setAssist] = useState<SettingsAssistTemplateSummary[]>([])
  const [personas, setPersonas] = useState<SettingsPersonaPromptSummary[]>([])
  const [search, setSearch] = useState('')
  const [kind, setKind] = useState<CatalogKind>('assist')
  const [selectedId, setSelectedId] = useState('')
  const [system, setSystem] = useState('')
  const [prompt, setPrompt] = useState('')
  const [systemDe, setSystemDe] = useState('')
  const [personaMeta, setPersonaMeta] = useState<SettingsPersonaPromptDetail | null>(null)
  const [dirty, setDirty] = useState(false)
  const [centerTab, setCenterTab] = useState('editor')
  const [accordion, setAccordion] = useState<string | null>(null)
  const [useMockData, setUseMockData] = useState(true)
  const [locale, setLocale] = useState('en')
  const [context, setContext] = useState('')
  const [profile, setProfile] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<SettingsAssistPromptTestResponse | null>(null)

  const selectedAssist = assist.find((t) => t.id === selectedId)

  const loadCatalogs = useCallback(async () => {
    const [aRes, pRes] = await Promise.all([
      fetch(paths.routes.apiSettingsPrompts),
      fetch(paths.routes.apiSettingsPersonaPrompts),
    ])
    if (!aRes.ok) throw new Error(`Failed to load assist templates (${aRes.status})`)
    if (!pRes.ok) throw new Error(`Failed to load persona prompts (${pRes.status})`)
    const aJson = (await aRes.json()) as SettingsAssistTemplatesResponse
    const pJson = (await pRes.json()) as SettingsPersonaPromptListResponse
    setAssist(aJson.templates)
    setPersonas(pJson.items)
    return { assist: aJson.templates, personas: pJson.items }
  }, [])

  const applyAssist = useCallback((t: SettingsAssistTemplateSummary) => {
    setKind('assist')
    setSelectedId(t.id)
    setSystem(t.system)
    setPrompt(t.prompt || t.user)
    setSystemDe('')
    setPersonaMeta(null)
    setDirty(false)
    setResult(null)
    setError(null)
  }, [])

  const applyPersona = useCallback(async (personaId: string) => {
    const res = await fetch(paths.routes.apiSettingsPersonaPromptDetail(personaId))
    if (!res.ok) {
      const err = (await res.json().catch(() => null)) as { error?: string } | null
      throw new Error(err?.error || `Failed to load persona prompt (${res.status})`)
    }
    const detail = (await res.json()) as SettingsPersonaPromptDetail
    setKind('persona')
    setSelectedId(personaId)
    setSystem('')
    setPrompt(detail.systemPrompt)
    setSystemDe(detail.systemPromptDe || '')
    setPersonaMeta(detail)
    setDirty(false)
    setResult(null)
    setError(null)
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { assist: a } = await loadCatalogs()
        if (cancelled) return
        if (a[0]) applyAssist(a[0])
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [applyAssist, loadCatalogs])

  function onInsertVar(syntax: string) {
    setPrompt((prev) => prev + syntax)
    setDirty(true)
    setCenterTab('editor')
  }

  async function onSave() {
    if (!selectedId) return
    setSaving(true)
    setError(null)
    try {
      if (kind === 'assist') {
        const res = await fetch(paths.routes.apiSettingsPromptDetail(selectedId), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ system, prompt }),
        })
        if (!res.ok) {
          const err = (await res.json().catch(() => null)) as { error?: string } | null
          throw new Error(err?.error || `Save failed (${res.status})`)
        }
        const { assist: next } = await loadCatalogs()
        const t = next.find((row) => row.id === selectedId)
        if (t) applyAssist(t)
      } else {
        const res = await fetch(paths.routes.apiSettingsPersonaPromptDetail(selectedId), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemPrompt: prompt,
            systemPromptDe: systemDe || null,
          }),
        })
        if (!res.ok) {
          const err = (await res.json().catch(() => null)) as { error?: string } | null
          throw new Error(err?.error || `Save failed (${res.status})`)
        }
        await loadCatalogs()
        await applyPersona(selectedId)
      }
      setDirty(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function onReset() {
    if (!selectedId) return
    setSaving(true)
    setError(null)
    try {
      if (kind === 'assist') {
        const res = await fetch(paths.routes.apiSettingsPromptDetail(selectedId), {
          method: 'DELETE',
        })
        if (!res.ok) {
          const err = (await res.json().catch(() => null)) as { error?: string } | null
          throw new Error(err?.error || `Reset failed (${res.status})`)
        }
        const { assist: next } = await loadCatalogs()
        const t = next.find((row) => row.id === selectedId)
        if (t) applyAssist(t)
      } else {
        const res = await fetch(paths.routes.apiSettingsPersonaPromptDetail(selectedId), {
          method: 'DELETE',
        })
        if (!res.ok) {
          const err = (await res.json().catch(() => null)) as { error?: string } | null
          throw new Error(err?.error || `Reset failed (${res.status})`)
        }
        await loadCatalogs()
        await applyPersona(selectedId)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Reset failed')
    } finally {
      setSaving(false)
    }
  }

  async function onTest() {
    setTesting(true)
    setError(null)
    setResult(null)
    try {
      if (kind === 'persona') {
        setResult({
          stubbed: true,
          templateId: `persona-chat:${selectedId}`,
          text: prompt,
          json: null,
          suggestions: [],
        })
        return
      }
      const body: Record<string, unknown> = {
        templateId: selectedId,
        locale,
        system,
        prompt,
      }
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

  const title =
    kind === 'assist'
      ? selectedAssist?.label || selectedId
      : personaMeta?.name || selectedId

  const canReset =
    kind === 'assist' ? Boolean(selectedAssist?.overridden) : Boolean(personaMeta?.hasCustom)

  return (
    <div className="pb-workspace" data-testid="prompt-builder-workspace">
      <p>
        <Link href={paths.routes.settingsAdmin} className="audion-link">
          ← Admin
        </Link>
      </p>
      <Hint panel>
        Full Prompt Builder — Assist templates and persona chat system prompts. Click a variable
        chip to insert; Save persists from this toolbar.
      </Hint>

      <Panel className="pb-workspace__toolbar">
        <div className="pb-workspace__toolbar-meta">
          <Text role="headline" as="h2">
            {loading ? 'Loading…' : title || 'Select a template'}
          </Text>
          <Text role="meta">
            {kind === 'assist' ? selectedId : `persona · ${selectedId}`}
            {dirty ? ' · unsaved' : ''}{' '}
            {kind === 'assist' && selectedAssist?.overridden ? (
              <Chip static size="sm">
                overridden
              </Chip>
            ) : null}
            {kind === 'persona' && personaMeta?.hasCustom ? (
              <Chip static size="sm">
                custom
              </Chip>
            ) : null}
          </Text>
        </div>
        <div className="pb-workspace__toolbar-actions">
          <label className="pb-mock-label">
            <input
              type="checkbox"
              checked={useMockData}
              onChange={(e) => setUseMockData(e.target.checked)}
              data-testid="pb-mock-toggle"
            />
            Mock preview data
          </label>
          <Button
            type="button"
            onClick={onSave}
            disabled={saving || !selectedId || !dirty}
            data-testid="pb-save"
          >
            {saving ? 'Saving…' : 'Save'}
          </Button>
          <Button
            type="button"
            variant="subtle"
            onClick={onReset}
            disabled={saving || !selectedId || !canReset}
            data-testid="pb-reset"
          >
            Reset
          </Button>
          <Button
            type="button"
            onClick={onTest}
            disabled={testing || !selectedId}
            data-testid="pb-test"
          >
            {testing ? 'Testing…' : 'Test'}
          </Button>
        </div>
      </Panel>

      {error ? <Alert tone="error">{error}</Alert> : null}

      {!loading ? (
        <div className="pb-workspace__body">
          <ResizablePanel initialWidth={260} minWidth={200} maxWidth={400} side="left">
            <TemplateRail
              search={search}
              onSearchChange={setSearch}
              assist={assist}
              personas={personas}
              selectedKind={kind}
              selectedId={selectedId}
              onSelectAssist={(id) => {
                const t = assist.find((row) => row.id === id)
                if (t) applyAssist(t)
              }}
              onSelectPersona={(id) => {
                void applyPersona(id).catch((e) =>
                  setError(e instanceof Error ? e.message : 'Load failed'),
                )
              }}
            />
          </ResizablePanel>

          <div className="pb-workspace__center">
            <VariablePalette onInsert={onInsertVar} />

            {kind === 'assist' ? (
              <Accordion
                aria-label="Assist system message"
                value={accordion}
                onChange={setAccordion}
                items={[
                  {
                    id: 'system',
                    title: 'System message',
                    preview: system.slice(0, 80) || 'Empty',
                    panel: (
                      <Field label="System">
                        <Textarea
                          value={system}
                          onChange={(e) => {
                            setSystem(e.target.value)
                            setDirty(true)
                          }}
                          rows={4}
                          data-testid="pb-system"
                        />
                      </Field>
                    ),
                  },
                ]}
              />
            ) : (
              <Accordion
                aria-label="German system prompt"
                value={accordion}
                onChange={setAccordion}
                items={[
                  {
                    id: 'de',
                    title: 'German system prompt (optional)',
                    preview: systemDe.slice(0, 80) || 'Empty',
                    panel: (
                      <Field label="systemPromptDe">
                        <Textarea
                          value={systemDe}
                          onChange={(e) => {
                            setSystemDe(e.target.value)
                            setDirty(true)
                          }}
                          rows={4}
                          data-testid="pb-system-de"
                        />
                      </Field>
                    ),
                  },
                ]}
              />
            )}

            <ToggleGroup
              aria-label="Editor mode"
              value={centerTab}
              onChange={setCenterTab}
              options={[
                { value: 'editor', label: 'Editor' },
                { value: 'preview', label: 'Live preview' },
              ]}
            />

            {centerTab === 'editor' ? (
              <PromptEditor
                value={prompt}
                onChange={(next) => {
                  setPrompt(next)
                  setDirty(true)
                }}
                placeholder={
                  kind === 'assist' ? 'Assist prompt body…' : 'Persona chat system prompt…'
                }
              />
            ) : (
              <LivePreviewPanel
                prompt={prompt}
                useMockData={useMockData}
                context={{
                  locale,
                  context,
                  persona_profile: profile,
                }}
              />
            )}
          </div>

          <ResizablePanel initialWidth={320} minWidth={260} maxWidth={480} side="right">
            <div className="pb-workspace__right">
              <VariableContextPanel
                locale={locale}
                onLocaleChange={setLocale}
                context={context}
                onContextChange={setContext}
                personaProfile={profile}
                onPersonaProfileChange={setProfile}
                useMockData={useMockData}
              />
              <ExecutionOutputPanel
                result={result}
                error={null}
                testing={testing}
                onClear={() => setResult(null)}
              />
            </div>
          </ResizablePanel>
        </div>
      ) : null}
    </div>
  )
}
