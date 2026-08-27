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
import { previewAdaptivePromptWithVoice } from '../../lib/chat/adaptive-persona-chat-prompt'
import { paths } from '../../lib/paths'
import { useT } from '../../lib/user-prefs'
import { ExecutionOutputPanel } from './ExecutionOutputPanel'
import { LivePreviewPanel } from './LivePreviewPanel'
import { PromptEditor } from './PromptEditor'
import { ResizablePanel } from './ResizablePanel'
import { TemplateRail, type CatalogKind } from './TemplateRail'
import { VariableContextPanel } from './VariableContextPanel'
import { VariablePalette } from './VariablePalette'
import './prompt-builder.css'

export function PromptBuilderWorkspace() {
  const t = useT()
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

  const selectedAssist = assist.find((row) => row.id === selectedId)

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

  const applyAssist = useCallback((row: SettingsAssistTemplateSummary) => {
    setKind('assist')
    setSelectedId(row.id)
    setSystem(row.system)
    setPrompt(row.prompt || row.user)
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
        const row = next.find((item) => item.id === selectedId)
        if (row) applyAssist(row)
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
        const row = next.find((item) => item.id === selectedId)
        if (row) applyAssist(row)
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
        const preview =
          personaMeta != null
            ? previewAdaptivePromptWithVoice(personaMeta.adaptiveProfilePrompt, prompt)
            : prompt
        setResult({
          stubbed: true,
          templateId: `persona-chat:${selectedId}`,
          text: preview,
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

  const personaLivePreview =
    kind === 'persona' && personaMeta
      ? previewAdaptivePromptWithVoice(personaMeta.adaptiveProfilePrompt, prompt)
      : prompt

  return (
    <div className="pb-workspace" data-testid="prompt-builder-workspace">
      <p>
        <Link href={paths.routes.settingsAdmin} className="audion-link">
          {t('admin.backAdmin')}
        </Link>
      </p>
      <Hint panel>{t('prompts.hint')}</Hint>

      <Panel className="pb-workspace__toolbar">
        <div className="pb-workspace__toolbar-meta">
          <Text role="headline" as="h2">
            {loading ? t('common.loading') : title || t('prompts.selectTemplate')}
          </Text>
          <Text role="meta">
            {kind === 'assist' ? selectedId : `persona · ${selectedId}`}
            {dirty ? ` · ${t('prompts.unsaved')}` : ''}{' '}
            {kind === 'assist' && selectedAssist?.overridden ? (
              <Chip static size="sm">
                {t('prompts.overridden')}
              </Chip>
            ) : null}
            {kind === 'persona' && personaMeta?.hasCustom ? (
              <Chip static size="sm">
                {t('prompts.custom')}
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
            {t('prompts.mockPreview')}
          </label>
          <Button
            type="button"
            onClick={onSave}
            disabled={saving || !selectedId || !dirty}
            data-testid="pb-save"
          >
            {saving ? t('common.saving') : t('common.save')}
          </Button>
          <Button
            type="button"
            variant="subtle"
            onClick={onReset}
            disabled={saving || !selectedId || !canReset}
            data-testid="pb-reset"
          >
            {t('common.reset')}
          </Button>
          <Button
            type="button"
            onClick={onTest}
            disabled={testing || !selectedId}
            data-testid="pb-test"
          >
            {testing ? t('common.testing') : t('common.test')}
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
                const row = assist.find((item) => item.id === id)
                if (row) applyAssist(row)
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
                aria-label={t('prompts.systemMessage')}
                value={accordion}
                onChange={setAccordion}
                items={[
                  {
                    id: 'system',
                    title: t('prompts.systemMessage'),
                    preview: system.slice(0, 80) || t('common.empty'),
                    panel: (
                      <Field label={t('prompts.systemMessage')}>
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
                aria-label={t('prompts.systemDeOptional')}
                value={accordion}
                onChange={setAccordion}
                items={[
                  {
                    id: 'de',
                    title: t('prompts.systemDeOptional'),
                    preview: systemDe.slice(0, 80) || t('common.empty'),
                    panel: (
                      <Field label={t('prompts.systemDeOptional')}>
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

            {kind === 'persona' ? <Hint panel>{t('prompts.personaAdaptiveHint')}</Hint> : null}

            <ToggleGroup
              aria-label={t('prompts.editor')}
              value={centerTab}
              onChange={setCenterTab}
              options={[
                { value: 'editor', label: t('prompts.editor') },
                { value: 'preview', label: t('prompts.livePreview') },
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
                  kind === 'assist' ? t('prompts.assistBodyPh') : t('prompts.personaVoicePh')
                }
              />
            ) : (
              <LivePreviewPanel
                prompt={personaLivePreview}
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
