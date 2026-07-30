import React from 'react'
import Link from 'next/link'
import { Panel, Text } from '@msqdx/ui'
import { paths } from '../lib/paths'

const ADMIN_CARDS = [
  {
    href: paths.routes.settingsAdminProviders,
    title: 'Providers',
    meta: 'AI runtime and key status',
  },
  {
    href: paths.routes.settingsAdminPrompts,
    title: 'Prompts',
    meta: 'Assist templates and test',
  },
  {
    href: paths.routes.settingsAdminApiDocs,
    title: 'API docs',
    meta: 'Route catalog and health',
  },
] as const

export function SettingsAdminHubPanel() {
  return (
    <section className="audion-index audion-tg-index" data-testid="settings-admin-hub">
      <p className="audion-settings-help">
        <Link href={paths.routes.settings} className="audion-link">
          ← Settings
        </Link>
      </p>
      <ul className="audion-tg-grid">
        {ADMIN_CARDS.map((card) => (
          <li key={card.href}>
            <Link href={card.href} className="audion-tg-card audion-tg-card--create">
              <Panel as="div" className="audion-tg-card-panel audion-tg-card-panel--create">
                <Text role="headline" as="span" className="audion-tg-card-title">
                  {card.title}
                </Text>
                <p className="audion-tg-card-meta">
                  <span>{card.meta}</span>
                </p>
              </Panel>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
