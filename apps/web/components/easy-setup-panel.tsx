'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import type { ProjectEasySetupResponse } from '@audion-v3/contracts'
import { Alert, Button, Field, Input, Panel, Text, Textarea } from '@msqdx/ui'
import { paths } from '../lib/paths'
import { useT } from '../lib/user-prefs'

type FormState = {
  customerName: string
  about: string
  websiteUrl: string
  projectName: string
}

const emptyForm = (): FormState => ({
  customerName: '',
  about: '',
  websiteUrl: '',
  projectName: '',
})

export function EasySetupPanel() {
  const t = useT()
  const [form, setForm] = useState<FormState>(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [result, setResult] = useState<ProjectEasySetupResponse | null>(null)

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    const customer = form.customerName.trim()
    const about = form.about.trim()
    if (!customer || !about) {
      setFieldError(t('setup.requiredFields'))
      return
    }
    setFieldError(null)
    setError(null)
    setResult(null)
    setSubmitting(true)
    try {
      const body: Record<string, string> = {
        customer_name: customer,
        about,
      }
      if (form.websiteUrl.trim()) body.website_url = form.websiteUrl.trim()
      if (form.projectName.trim()) body.project_name = form.projectName.trim()

      const response = await fetch(paths.routes.apiProjectsBootstrap, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!response.ok) {
        const err = (await response.json().catch(() => null)) as { error?: string } | null
        throw new Error(err?.error || `${t('setup.setupFailed')} (${response.status})`)
      }
      const data = (await response.json()) as ProjectEasySetupResponse
      setResult(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('setup.setupFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  if (result) {
    return (
      <Panel className="audion-stack" data-testid="easy-setup-success">
        <Text role="headline" as="h2">
          {t('setup.readyTitle')}
        </Text>
        <Text role="body">
          {result.stubbed ? t('setup.readyStub') : t('setup.readyLive')}
        </Text>
        {result.websiteExcerptIncluded ? (
          <Text role="meta">{t('setup.websiteMerged')}</Text>
        ) : null}
        <ul className="audion-stack" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          <li>
            <Link
              href={paths.routes.projectDetail(result.project.id)}
              className="audion-link"
              data-testid="easy-setup-link-project"
            >
              {t('setup.linkProject', { name: result.project.name })}
            </Link>
          </li>
          <li>
            <Link
              href={paths.routes.targetGroupDetail(result.targetGroup.id)}
              className="audion-link"
              data-testid="easy-setup-link-tg"
            >
              {t('setup.linkTg', { name: result.targetGroup.name })}
            </Link>
          </li>
          <li>
            <Link
              href={paths.routes.personaDetail(result.persona.id)}
              className="audion-link"
              data-testid="easy-setup-link-persona"
            >
              {t('setup.linkPersona', { name: result.persona.name })}
            </Link>
          </li>
        </ul>
        <Button
          type="button"
          size="sm"
          onClick={() => {
            setResult(null)
            setForm(emptyForm())
          }}
        >
          {t('setup.runAgain')}
        </Button>
      </Panel>
    )
  }

  return (
    <Panel className="audion-stack" data-testid="easy-setup-form">
      <Text role="headline" as="h2">
        {t('setup.title')}
      </Text>
      <Text role="body">{t('setup.body')}</Text>
      <form className="audion-stack" onSubmit={onSubmit}>
        <Field label={t('setup.customer')}>
          <Input
            value={form.customerName}
            onChange={(e) => setForm((f) => ({ ...f, customerName: e.target.value }))}
            placeholder={t('setup.customerPh')}
            data-testid="easy-setup-customer"
            aria-required="true"
          />
        </Field>
        <Field label={t('setup.about')}>
          <Textarea
            value={form.about}
            onChange={(e) => setForm((f) => ({ ...f, about: e.target.value }))}
            placeholder={t('setup.aboutPh')}
            rows={5}
            data-testid="easy-setup-about"
            aria-required="true"
          />
        </Field>
        <Field label={t('setup.website')}>
          <Input
            value={form.websiteUrl}
            onChange={(e) => setForm((f) => ({ ...f, websiteUrl: e.target.value }))}
            placeholder={t('setup.websitePh')}
            data-testid="easy-setup-website"
          />
        </Field>
        <Field label={t('setup.projectName')}>
          <Input
            value={form.projectName}
            onChange={(e) => setForm((f) => ({ ...f, projectName: e.target.value }))}
            placeholder={t('setup.projectNamePh')}
            data-testid="easy-setup-project-name"
          />
        </Field>
        {fieldError ? <Alert tone="error">{fieldError}</Alert> : null}
        {error ? <Alert tone="error">{error}</Alert> : null}
        <Button type="submit" disabled={submitting} data-testid="easy-setup-submit">
          {submitting ? t('setup.submitting') : t('setup.submit')}
        </Button>
      </form>
    </Panel>
  )
}
