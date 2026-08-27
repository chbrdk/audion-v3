'use client'

import React from 'react'
import Link from 'next/link'
import { Panel, Text } from '@msqdx/ui'
import { paths } from '../lib/paths'
import { useT } from '../lib/user-prefs'

export function HomeWorkspacePanel() {
  const t = useT()
  return (
    <Panel className="audion-stack">
      <Text role="headline" as="h2">
        {t('home.headline')}
      </Text>
      <Text role="body">{t('home.body')}</Text>
      <Text role="meta">
        {t('home.metaBefore')}{' '}
        <Link href={paths.routes.setup} className="audion-link">
          {t('home.easySetup')}
        </Link>{' '}
        {t('home.metaAfter')}
      </Text>
    </Panel>
  )
}

export function HomeTopbarActions() {
  const t = useT()
  return (
    <>
      <Link href={paths.routes.setup} className="audion-link">
        {t('home.easySetup')}
      </Link>
      <Link href={paths.routes.queue} className="audion-link">
        {t('home.queue')}
      </Link>
      <Link href={paths.routes.personas} className="audion-link">
        {t('home.openFirstSlice')}
      </Link>
    </>
  )
}
