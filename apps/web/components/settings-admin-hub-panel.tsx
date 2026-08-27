'use client'

import React from 'react'
import Link from 'next/link'
import { Panel, Text } from '@msqdx/ui'
import { paths } from '../lib/paths'
import { useT } from '../lib/user-prefs'

const ADMIN_CARDS = [
  {
    href: paths.routes.settingsAdminProviders,
    titleKey: 'admin.providers',
    metaKey: 'admin.providersMeta',
  },
  {
    href: paths.routes.settingsAdminPrompts,
    titleKey: 'admin.prompts',
    metaKey: 'admin.promptsMeta',
  },
  {
    href: paths.routes.settingsAdminTokens,
    titleKey: 'admin.tokens',
    metaKey: 'admin.tokensMeta',
  },
  {
    href: paths.routes.settingsAdminApiDocs,
    titleKey: 'admin.apiDocs',
    metaKey: 'admin.apiDocsMeta',
  },
  {
    href: paths.routes.queue,
    titleKey: 'admin.queue',
    metaKey: 'admin.queueMeta',
  },
] as const

export function SettingsAdminHubPanel() {
  const t = useT()
  return (
    <section className="audion-index audion-tg-index" data-testid="settings-admin-hub">
      <p className="audion-settings-help">
        <Link href={paths.routes.settings} className="audion-link">
          {t('common.backToSettings')}
        </Link>
      </p>
      <ul className="audion-tg-grid">
        {ADMIN_CARDS.map((card) => (
          <li key={card.href}>
            <Link href={card.href} className="audion-tg-card audion-tg-card--create">
              <Panel as="div" variant="card" className="audion-tg-card-panel audion-tg-card-panel--create">
                <Text role="headline" as="span" className="audion-tg-card-title">
                  {t(card.titleKey)}
                </Text>
                <p className="audion-tg-card-meta">
                  <span>{t(card.metaKey)}</span>
                </p>
              </Panel>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
