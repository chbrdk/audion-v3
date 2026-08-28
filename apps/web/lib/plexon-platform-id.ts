/**
 * Plexon Collection ids are UUIDs. Local / fixture placeholders (`plx-local-*`,
 * `plx-collection-demo-*`) must be treated as unbound for outbound origin.
 */

const PLATFORM_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isRealPlatformProjectId(id: string | null | undefined): boolean {
  const trimmed = id?.trim()
  if (!trimmed) return false
  return PLATFORM_UUID_RE.test(trimmed)
}

/** True when the project still needs `audion-project-origin` (or re-bind). */
export function needsPlexonOrigin(platformProjectId: string | null | undefined): boolean {
  return !isRealPlatformProjectId(platformProjectId)
}
