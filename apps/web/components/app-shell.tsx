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

const PRIMARY_NAV = [
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
  {
    id: 'chat',
    href: paths.routes.chat,
    label: 'Chat',
    icon: <NavIconChat />,
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
}) {
  const pathname = usePathname()
  const { displayName } = useUserPrefs()
  const [railEdge, setRailEdge] = useState<RailDockEdge>(paths.railDockEdge)

  const frameStyle = useMemo(
    () =>
      shellFrameStyle({
        railInsetRem: paths.railInsetRem,
        railGapRem: paths.railGapRem,
        railWidthRem: paths.railWidthRem,
        mainGutterRem: paths.mainGutterRem,
      }),
    [],
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
      rail={
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
      }
      brandCorner={<BrandCorner label="AUDION" />}
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
    </AppFrame>
  )
}
