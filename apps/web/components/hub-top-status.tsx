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

/** Quiet count TopStatus for list hubs — no demo/fixtures chrome. */
export function HubTopStatus({
  total,
  entity,
}: {
  total: number
  entity: HubEntity
  /** @deprecated Ignored — fixtures origin is not surfaced in the UI. */
  demo?: boolean
}) {
  const t = useT()
  return <TopStatus level="ok" primary={t(COUNT_KEYS[entity], { count: total })} />
}
