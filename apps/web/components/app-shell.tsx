'use client'

import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import {
  AppFrame,
  MsqdxLogoMark,
  NavRail,
  ShellBackButton,
  shellFrameStyle,
  type RailDockEdge,
} from '../lib/msqdx-ui-shell'
import { Avatar } from '@msqdx/ui'
import {
  NavIconOverview,
  NavIconPersonas,
  NavIconProjects,
  NavIconTargetGroups,
  NavIconJourneys,
  NavIconStudies,
  NavIconChat,
} from './nav-icons'
import { paths } from '../lib/paths'
import { useUserPrefs } from '../lib/user-prefs'
import { PlatformAssistantHost } from './platform-assistant-host'
import { ShellBrandCorner } from './shell-brand-corner'

export function AppShell({
  children,
  description,
  descriptionKey,
  leading,
  actions,
  presentation = 'default',
}: {
  children: ReactNode
  /** Optional in-page lead under the rail chrome (not a global topbar title). */
  description?: string
  /** Prefer over `description` — resolves via locale dictionary. */
  descriptionKey?: string
  /** Chat / special chrome on the left of the optional topbar. */
  leading?: ReactNode
  actions?: ReactNode
  /** Embed: no nav rail / brand corner / platform assistant. Spec: chat-embed.md */
  presentation?: 'default' | 'embed'
  /** @deprecated Global AppShell PageTitle removed — ignored (nav + magazine heroes own identity). */
  title?: string | null
  /** @deprecated Global AppShell PageTitle removed — ignored. */
  titleKey?: string
  /** @deprecated Global AppShell PageTitle removed — ignored. */
  titleHref?: string
  /** @deprecated Global AppShell PageTitle removed — ignored. */
  titleTone?: 'default' | 'context'
  /** @deprecated Global AppShell status topbar removed — ignored (status lives in magazine chrome). */
  status?: ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { displayName, t } = useUserPrefs()
  const [railEdge, setRailEdge] = useState<RailDockEdge>(paths.railDockEdge)
  const embed = presentation === 'embed'
  const pageLead = descriptionKey ? t(descriptionKey) : description
  const showTopbar = Boolean(leading || actions)

  const frameStyle = useMemo(
    () =>
      shellFrameStyle({
        railInsetRem: embed ? 0 : paths.railInsetRem,
        railGapRem: embed ? 0 : paths.railGapRem,
        railWidthRem: embed ? 0 : paths.railWidthRem,
        mainGutterRem: embed ? 1 : paths.mainGutterRem,
      }),
    [embed],
  )

  function isActive(href: string): boolean {
    return href === '/' ? pathname === href : pathname.startsWith(href)
  }

  const primaryNav = useMemo(
    () => [
      {
        id: 'chat',
        href: paths.routes.chat,
        label: t('nav.chat'),
        icon: <NavIconChat />,
      },
      { id: 'home', href: paths.routes.home, label: t('nav.home'), icon: <NavIconOverview /> },
      {
        id: 'projects',
        href: paths.routes.projects,
        label: t('nav.projects'),
        icon: <NavIconProjects />,
      },
      {
        id: 'personas',
        href: paths.routes.personas,
        label: t('nav.personas'),
        icon: <NavIconPersonas />,
      },
      {
        id: 'target-groups',
        href: paths.routes.targetGroups,
        label: t('nav.targetGroups'),
        icon: <NavIconTargetGroups />,
      },
      {
        id: 'journeys',
        href: paths.routes.journeys,
        label: t('nav.journeys'),
        icon: <NavIconJourneys />,
      },
      {
        id: 'studies',
        href: paths.routes.studies,
        label: t('nav.studies'),
        icon: <NavIconStudies />,
      },
    ],
    [t],
  )

  return (
    <AppFrame
      railEdge={railEdge}
      style={frameStyle}
      data-presentation={presentation}
      rail={
        embed ? null : (
          <NavRail
            dockable
            dockStorageKey={paths.railDockStorageKey}
            defaultDockEdge={paths.railDockEdge}
            onDockEdgeChange={setRailEdge}
            logo={<MsqdxLogoMark size={26} title="MSQ DX" />}
            logoLabel={t('nav.homeAria', { brand: paths.brandLabel })}
            linkComponent={Link}
            items={primaryNav.map((item) => ({ ...item, active: isActive(item.href) }))}
            footerItems={[
              {
                id: 'settings',
                label: t('nav.settings'),
                href: paths.routes.settings,
                active: isActive(paths.routes.settings),
                ariaLabel: t('nav.settingsAria'),
                icon: <Avatar name={displayName} size="sm" className="rail-avatar" />,
              },
            ]}
          />
        )
      }
      backCorner={
        embed ? null : (
          <ShellBackButton label={t('nav.back')} onClick={() => router.back()} />
        )
      }
      brandCorner={embed ? null : <ShellBrandCorner />}
      topbar={
        showTopbar ? (
          <>
            <div className="topbar-brand">{leading ?? null}</div>
            <div className="topbar-right">{actions}</div>
          </>
        ) : undefined
      }
    >
      <div className={showTopbar ? 'audion-stage' : 'audion-stage audion-stage--flush-top'}>
        {pageLead ? <p className="audion-page-lead">{pageLead}</p> : null}
        {children}
      </div>
      {embed ? null : <PlatformAssistantHost />}
    </AppFrame>
  )
}
