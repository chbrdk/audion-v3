'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import type { ProjectEasySetupResponse } from '@audion-v3/contracts'
import { Alert, Button, Field, Input, Panel, Text, Textarea } from '@msqdx/ui'
import { paths } from '../lib/paths'

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
      setFieldError('Customer name and about are required.')
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
        throw new Error(err?.error || `Setup failed (${response.status})`)
      }
      const data = (await response.json()) as ProjectEasySetupResponse
      setResult(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Setup failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (result) {
    return (
      <Panel className="audion-stack" data-testid="easy-setup-success">
        <Text role="headline" as="h2">
          Workspace ready
        </Text>
        <Text role="body">
          {result.stubbed
            ? 'Created with demo seeds (AI stub). Open any link below to continue.'
            : 'Created with native AI suggestions. Open any link below to continue.'}
        </Text>
        {result.websiteExcerptIncluded ? (
          <Text role="meta">Website text was merged into project knowledge.</Text>
        ) : null}
        <ul className="audion-stack" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          <li>
            <Link
              href={paths.routes.projectDetail(result.project.id)}
              className="audion-link"
              data-testid="easy-setup-link-project"
            >
              Project: {result.project.name}
            </Link>
          </li>
          <li>
            <Link
              href={paths.routes.targetGroupDetail(result.targetGroup.id)}
              className="audion-link"
              data-testid="easy-setup-link-tg"
            >
              Target group: {result.targetGroup.name}
            </Link>
          </li>
          <li>
            <Link
              href={paths.routes.personaDetail(result.persona.id)}
              className="audion-link"
              data-testid="easy-setup-link-persona"
            >
              Persona: {result.persona.name}
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
          Run again
        </Button>
      </Panel>
    )
  }

  return (
    <Panel className="audion-stack" data-testid="easy-setup-form">
      <Text role="headline" as="h2">
        Easy setup
      </Text>
      <Text role="body">
        One brief creates a project, first target group, and first persona.
      </Text>
      <form className="audion-stack" onSubmit={onSubmit}>
        <Field label="Customer / brand">
          <Input
            value={form.customerName}
            onChange={(e) => setForm((f) => ({ ...f, customerName: e.target.value }))}
            placeholder="Acme Mobility"
            data-testid="easy-setup-customer"
            aria-required="true"
          />
        </Field>
        <Field label="About">
          <Textarea
            value={form.about}
            onChange={(e) => setForm((f) => ({ ...f, about: e.target.value }))}
            placeholder="What the brand does, who they serve, and what you want to learn…"
            rows={5}
            data-testid="easy-setup-about"
            aria-required="true"
          />
        </Field>
        <Field label="Website URL (optional)">
          <Input
            value={form.websiteUrl}
            onChange={(e) => setForm((f) => ({ ...f, websiteUrl: e.target.value }))}
            placeholder="https://example.com"
            data-testid="easy-setup-website"
          />
        </Field>
        <Field label="Project name (optional)">
          <Input
            value={form.projectName}
            onChange={(e) => setForm((f) => ({ ...f, projectName: e.target.value }))}
            placeholder="Defaults to customer name"
            data-testid="easy-setup-project-name"
          />
        </Field>
        {fieldError ? <Alert tone="error">{fieldError}</Alert> : null}
        {error ? <Alert tone="error">{error}</Alert> : null}
        <Button type="submit" disabled={submitting} data-testid="easy-setup-submit">
          {submitting ? 'Creating…' : 'Create workspace'}
        </Button>
      </form>
    </Panel>
  )
}
