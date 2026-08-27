'use client'

import React from 'react'
import { TopStatus } from '@msqdx/ui'
import { useT } from '../lib/user-prefs'

type HubEntity = 'personas' | 'projects' | 'groups' | 'journeys' | 'studies' | 'conversations'

const COUNT_KEYS: Record<HubEntity, string> = {
  personas: 'status.personasCount',
  projects: 'status.projectsCount',
  groups: 'status.groupsCount',
  journeys: 'status.journeysCount',
  studies: 'status.studiesCount',
  conversations: 'status.conversationsCount',
}

/** Locale-aware TopStatus for list hubs (SET-L1). */
export function HubTopStatus({
  demo,
  total,
  entity,
}: {
  demo: boolean
  total: number
  entity: HubEntity
}) {
  const t = useT()
  return (
    <TopStatus
      level="ok"
      primary={demo ? t('status.demoData') : t(COUNT_KEYS[entity], { count: total })}
      secondary={demo ? t('status.fixturesCount', { count: total }) : t('status.live')}
    />
  )
}
