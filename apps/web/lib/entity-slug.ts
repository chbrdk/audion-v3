/**
 * Stable magazine URL keys for personas / target groups.
 * Spec: specs/domain/entity-url-slugs.md
 */

export function slugifyName(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug || 'item'
}

export function entityRouteKey(entity: { id: string; slug?: string | null }): string {
  const slug = entity.slug?.trim()
  return slug || entity.id
}

/**
 * Pick a unique slug among `taken` (excluding `excludeSlug` when reusing the same entity).
 */
export function allocateUniqueSlug(
  desired: string,
  taken: Iterable<string>,
  excludeSlug?: string | null,
): string {
  const base = slugifyName(desired)
  const exclude = excludeSlug?.trim() || ''
  const used = new Set(
    [...taken].map((s) => s.trim().toLowerCase()).filter((s) => s && s !== exclude.toLowerCase()),
  )
  if (!used.has(base)) return base
  for (let n = 2; n < 10_000; n += 1) {
    const candidate = `${base}-${n}`
    if (!used.has(candidate)) return candidate
  }
  return `${base}-${Date.now().toString(36)}`
}

/** Ensure summary/detail always expose a slug (legacy rows without column). */
export function ensureEntitySlug<T extends { id: string; name: string; slug?: string | null }>(
  entity: T,
): T & { slug: string } {
  const slug = entity.slug?.trim() || slugifyName(entity.name) || entity.id
  return { ...entity, slug }
}
