import type { PersonaVisualTile } from '@audion-v3/contracts'

function categoryKey(category: string): string {
  return category.trim().toLowerCase()
}

/**
 * V2-parity moodboard rebuild: keep locked tiles (first wins per category),
 * drop unlocked existing, append generated tiles for unlocked categories.
 */
export function mergeMoodboardTiles(
  existing: PersonaVisualTile[],
  generated: PersonaVisualTile[],
): PersonaVisualTile[] {
  const lockedByCategory = new Map<string, PersonaVisualTile>()
  const locked: PersonaVisualTile[] = []

  for (const tile of existing) {
    if (!tile.locked) continue
    const key = categoryKey(tile.category)
    if (!key || lockedByCategory.has(key)) continue
    const kept = { ...tile, locked: true }
    lockedByCategory.set(key, kept)
    locked.push(kept)
  }

  const unlocked: PersonaVisualTile[] = []
  for (const tile of generated) {
    const key = categoryKey(tile.category)
    if (key && lockedByCategory.has(key)) continue
    unlocked.push({ ...tile, locked: false })
  }

  return [...locked, ...unlocked]
}
