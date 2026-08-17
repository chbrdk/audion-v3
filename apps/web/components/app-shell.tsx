'use client'

import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import {
  AppFrame,
  BrandCorner,
  MsqdxLogoMark,
  NavRail,
  PageTitle,
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

const PRIMARY_NAV = [
  {
    id: 'chat',
    href: paths.routes.chat,
    label: 'Chat',
    icon: <NavIconChat />,
  },
  { id: 'home', href: paths.routes.home, label: 'Home', icon: <NavIconOverview /> },
  {
    id: 'projects',
    href: paths.routes.projects,
    label: 'Projects',
    icon: <NavIconProjects />,
  },
  { id: 'personas', href: paths.routes.personas, label: 'Personas', icon: <NavIconPersonas /> },
  {
    id: 'target-groups',
    href: paths.routes.targetGroups,
    label: 'Target groups',
    icon: <NavIconTargetGroups />,
  },
  {
    id: 'journeys',
    href: paths.routes.journeys,
    label: 'Journeys',
    icon: <NavIconJourneys />,
  },
  {
    id: 'studies',
    href: paths.routes.studies,
    label: 'Studies',
    icon: <NavIconStudies />,
  },
]

export function AppShell({
  children,
  title,
  titleHref,
  titleTone = 'default',
  description,
  leading,
  actions,
  status,
  presentation = 'default',
}: {
  children: ReactNode
  /** Page title in the topbar left. Omit when using `leading` instead. */
  title?: string | null
  /** Optional link for context titles (e.g. target group on persona detail). */
  titleHref?: string
  /** `context` = quieter / smaller topbar label (not the magazine hero). */
  titleTone?: 'default' | 'context'
  description?: string
  /** Replaces the title slot on the left (e.g. chat persona picker). */
  leading?: ReactNode
  actions?: ReactNode
  status?: ReactNode
  /** Embed: no nav rail / brand corner / platform assistant. Spec: chat-embed.md */
  presentation?: 'default' | 'embed'
}) {
  const pathname = usePathname()
  const { displayName } = useUserPrefs()
  const [railEdge, setRailEdge] = useState<RailDockEdge>(paths.railDockEdge)
  const embed = presentation === 'embed'

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

  const titleNode =
    title != null && title !== '' ? (
      titleTone === 'context' ? (
        <PageTitle className="audion-page-title--context">{title}</PageTitle>
      ) : (
        <PageTitle>{title}</PageTitle>
      )
    ) : null

  const brandContent = leading ?? (
    titleNode && titleHref ? (
      <Link href={titleHref} className="audion-page-title-link">
        {titleNode}
      </Link>
    ) : (
      titleNode
    )
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
            logoLabel="AUDION home"
            linkComponent={Link}
            items={PRIMARY_NAV.map((item) => ({ ...item, active: isActive(item.href) }))}
            footerItems={[
              {
                id: 'settings',
                label: 'Settings',
                href: paths.routes.settings,
                active: isActive(paths.routes.settings),
                ariaLabel: 'Settings',
                icon: <Avatar name={displayName} size="sm" className="rail-avatar" />,
              },
            ]}
          />
        )
      }
      brandCorner={embed ? null : <BrandCorner label="AUDION" />}
      topbar={
        <>
          <div className="topbar-brand">{brandContent}</div>
          <div className="topbar-right">
            {status}
            {actions}
          </div>
        </>
      }
    >
      {description ? <p className="audion-page-lead">{description}</p> : null}
      {children}
      {embed ? null : <PlatformAssistantHost />}
    </AppFrame>
  )
}
