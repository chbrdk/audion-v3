import type { ReactNode } from 'react'

/**
 * Local nav glyphs (Lucide-aligned paths) — avoids lucide React context during Next SSR.
 * Differentiation: Personas = single person · Target groups = people group · Journeys = route.
 */
function NavSvg({ children }: { children: ReactNode }) {
  return (
    <svg
      className="ui-icon"
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  )
}

/** Home — layout dashboard. */
export function NavIconOverview() {
  return (
    <NavSvg>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </NavSvg>
  )
}

/** Personas — single person (User). */
export function NavIconPersonas() {
  return (
    <NavSvg>
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </NavSvg>
  )
}

export function NavIconResearch() {
  return (
    <NavSvg>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 5 5" />
    </NavSvg>
  )
}

/** Projects — folder. */
export function NavIconProjects() {
  return (
    <NavSvg>
      <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9l-.81-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
    </NavSvg>
  )
}

/** Target groups — people group (Users). */
export function NavIconTargetGroups() {
  return (
    <NavSvg>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </NavSvg>
  )
}

/** Journeys — route with start/end. */
export function NavIconJourneys() {
  return (
    <NavSvg>
      <circle cx="6" cy="19" r="3" />
      <path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15" />
      <circle cx="18" cy="5" r="3" />
    </NavSvg>
  )
}

/** UX Studies — clipboard checklist. */
export function NavIconStudies() {
  return (
    <NavSvg>
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M12 11h4" />
      <path d="M12 16h4" />
      <path d="M8 11h.01" />
      <path d="M8 16h.01" />
    </NavSvg>
  )
}

/** Chat — message bubble. */
export function NavIconChat() {
  return (
    <NavSvg>
      <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
    </NavSvg>
  )
}

/** Pencil / edit — local SVG (no lucide SSR dependency). */
export function IconEdit({ size = 16 }: { size?: number }) {
  return (
    <svg
      className="ui-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M12 20h9"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Send / arrow-up — local SVG (no lucide SSR dependency). */
export function IconSend({ size = 18 }: { size?: number }) {
  return (
    <svg
      className="ui-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M12 19V5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="m7 10 5-5 5 5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Mic — voice modality. Prefer `@msqdx/ui` IconMic. */
export { IconMic } from '@msqdx/ui'

/** Videocam — Tavus / video modality. Prefer `@msqdx/ui` IconVideo. */
export { IconVideo } from '@msqdx/ui'

/** Share — copy public chat link. Prefer `@msqdx/ui` IconShare. */
export { IconShare } from '@msqdx/ui'

/** History — conversation list. Prefer `@msqdx/ui` IconHistory. */
export { IconHistory } from '@msqdx/ui'

/** Moodboard / images grid. Prefer `@msqdx/ui` IconMoodboard. */
export { IconMoodboard } from '@msqdx/ui'

/** Trash / delete — local SVG (no lucide SSR dependency). */
export function IconDelete({ size = 16 }: { size?: number }) {
  return (
    <svg
      className="ui-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M4 7h16"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M10 11v6M14 11v6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Sparkle — AI action glyph (no lucide SSR dependency). */
export function IconSparkle({ size = 16 }: { size?: number }) {
  return (
    <svg
      className="ui-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M12 3.5 13.6 9.4 19.5 11 13.6 12.6 12 18.5 10.4 12.6 4.5 11 10.4 9.4 12 3.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M18.5 4.5 19.2 6.8 21.5 7.5 19.2 8.2 18.5 10.5 17.8 8.2 15.5 7.5 17.8 6.8 18.5 4.5Z"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** List view — bullet list. */
export function IconList({ size = 18 }: { size?: number }) {
  return (
    <NavSvg>
      <path d="M8 6h13" />
      <path d="M8 12h13" />
      <path d="M8 18h13" />
      <path d="M3 6h.01" />
      <path d="M3 12h.01" />
      <path d="M3 18h.01" />
    </NavSvg>
  )
}

/** Play — run / test. */
export function IconPlay({ size = 18 }: { size?: number }) {
  return (
    <svg
      className="ui-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M8 5.5v13l11-6.5-11-6.5Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Stop — square. */
export function IconStop({ size = 18 }: { size?: number }) {
  return (
    <svg
      className="ui-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <rect x="7" y="7" width="10" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  )
}

/** Save — floppy / disk. */
export function IconSave({ size = 18 }: { size?: number }) {
  return (
    <NavSvg>
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" />
      <path d="M17 21v-7H7v7" />
      <path d="M7 3v5h8" />
    </NavSvg>
  )
}

/** Undo — corner up left. */
export function IconUndo({ size = 18 }: { size?: number }) {
  return (
    <NavSvg>
      <path d="M9 14 4 9l5-5" />
      <path d="M20 20v-7a4 4 0 0 0-4-4H4" />
    </NavSvg>
  )
}

/** Reset — rotate ccw. */
export function IconReset({ size = 18 }: { size?: number }) {
  return (
    <NavSvg>
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
    </NavSvg>
  )
}

/** Drag grip — six dots. */
export function IconGrip({ size = 18 }: { size?: number }) {
  return (
    <svg
      className="ui-icon audion-flow-toolbar-grip-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <circle cx="9" cy="7" r="1.25" />
      <circle cx="15" cy="7" r="1.25" />
      <circle cx="9" cy="12" r="1.25" />
      <circle cx="15" cy="12" r="1.25" />
      <circle cx="9" cy="17" r="1.25" />
      <circle cx="15" cy="17" r="1.25" />
    </svg>
  )
}

