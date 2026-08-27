'use client'

import React, { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { Button, Field, Hint, Input, Text } from '@msqdx/ui'
import { paths } from '../lib/paths'
import { getPlexonForgotPasswordUrl, getPlexonRegisterPageUrl } from '../lib/plexon-links'
import { useT } from '../lib/user-prefs'

function LoginForm({ plexonConfigured }: { plexonConfigured: boolean }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') || paths.routes.home
  const registerUrl = getPlexonRegisterPageUrl()
  const forgotUrl = getPlexonForgotPasswordUrl()
  const t = useT()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!plexonConfigured) return
    setLoading(true)
    setError(null)
    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
        callbackUrl: redirectTo,
      })
      if (result?.error) throw new Error(t('login.invalidCredentials'))
      if (result?.ok) {
        router.replace(redirectTo)
        router.refresh()
        return
      }
      throw new Error(t('login.failed'))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('login.failed'))
    } finally {
      setLoading(false)
    }
  }

  if (!plexonConfigured) {
    return (
      <div className="audion-login-panel">
        <Text role="headline" as="h1">
          {t('login.title')}
        </Text>
        <Hint panel>{t('login.unconfigured')}</Hint>
        <p className="audion-login-links">
          <Link href={paths.routes.home} className="audion-link">
            {t('login.continueToApp')}
          </Link>
        </p>
      </div>
    )
  }

  return (
    <form className="audion-login-panel" onSubmit={handleSubmit}>
      <Text role="headline" as="h1">
        {t('login.title')}
      </Text>
      <Text role="body" className="audion-login-lede">
        {t('login.lead')}
      </Text>
      {error ? (
        <p className="audion-login-error" role="alert">
          {error}
        </p>
      ) : null}
      <Field label={t('login.email')} size="md">
        <Input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          block
          aria-label={t('login.email')}
        />
      </Field>
      <Field label={t('login.password')} size="md">
        <Input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          block
          aria-label={t('login.password')}
        />
      </Field>
      <Button type="submit" variant="primary" disabled={loading}>
        {loading ? t('common.signingIn') : t('common.signIn')}
      </Button>
      <p className="audion-login-links">
        {registerUrl ? (
          <a href={registerUrl} className="audion-link">
            {t('login.createAccount')}
          </a>
        ) : null}
        {registerUrl && forgotUrl ? <span aria-hidden> · </span> : null}
        {forgotUrl ? (
          <a href={forgotUrl} className="audion-link">
            {t('login.forgotPassword')}
          </a>
        ) : null}
      </p>
    </form>
  )
}

export function LoginPageClient({ plexonConfigured }: { plexonConfigured: boolean }) {
  const t = useT()
  return (
    <Suspense
      fallback={
        <div className="audion-login-panel">
          <Text role="headline" as="h1">
            {t('login.title')}
          </Text>
        </div>
      }
    >
      <LoginForm plexonConfigured={plexonConfigured} />
    </Suspense>
  )
}
