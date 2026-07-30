import type { PersonaVisualTile, PersonaVisuals } from '@audion-v3/contracts'
import { personaVisualPath } from './paths'

export const PERSONA_VISUAL_CATEGORIES = [
  'portrait',
  'tone',
  'material',
  'ui',
  'space',
  'accent',
  'visual',
] as const

export function newPersonaVisualTileId(): string {
  return `tile-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

export function emptyPersonaVisuals(): PersonaVisuals {
  return { styleKeywords: [], tiles: [] }
}

export function resolvePersonaVisuals(visuals: PersonaVisuals | null | undefined): PersonaVisuals {
  if (!visuals) return emptyPersonaVisuals()
  return {
    styleKeywords: Array.isArray(visuals.styleKeywords)
      ? visuals.styleKeywords.filter((k) => typeof k === 'string' && k.trim())
      : [],
    tiles: Array.isArray(visuals.tiles)
      ? visuals.tiles.map((tile, index) => ({
          id: tile.id?.trim() || `tile-${index}`,
          imageUrl: tile.imageUrl,
          category: tile.category?.trim() || 'visual',
          caption: tile.caption ?? null,
          locked: Boolean(tile.locked),
        }))
      : [],
  }
}

export function blankPersonaVisualTile(): PersonaVisualTile {
  return {
    id: newPersonaVisualTileId(),
    imageUrl: personaVisualPath('tone-warm'),
    category: 'visual',
    caption: 'New tile',
    locked: false,
  }
}

/** Persist payload — empty board becomes null. */
export function toPersonaWriteVisuals(visuals: PersonaVisuals): PersonaVisuals | null {
  const styleKeywords = visuals.styleKeywords.map((k) => k.trim()).filter(Boolean)
  const tiles = visuals.tiles
    .map((tile) => ({
      id: tile.id.trim() || newPersonaVisualTileId(),
      imageUrl: tile.imageUrl.trim(),
      category: tile.category.trim() || 'visual',
      caption: tile.caption?.trim() ? tile.caption.trim() : null,
      locked: Boolean(tile.locked),
    }))
    .filter((tile) => Boolean(tile.imageUrl))
  if (!styleKeywords.length && !tiles.length) return null
  return { styleKeywords, tiles }
}
