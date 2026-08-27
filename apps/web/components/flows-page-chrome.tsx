'use client'

import React from 'react'
import Link from 'next/link'
import { EmptyState } from '@msqdx/ui'
import { paths } from '../lib/paths'
import { useT } from '../lib/user-prefs'

/** Client chrome for flows hub — empty + back link via useT. */
export function FlowsPageChrome({
  empty,
  children,
}: {
  empty: boolean
  children: React.ReactNode
}) {
  const t = useT()
  return (
    <>
      <p className="msqdx-flow-lede">
        <Link href={paths.routes.studies}>{t('pages.flows.backStudies')}</Link>
        {' · '}
        Flows sind die produktseitige Schicht; Scenario-Packs bleiben für Labs.
      </p>
      {children}
      {empty ? <EmptyState>{t('flows.empty')}</EmptyState> : null}
    </>
  )
}
