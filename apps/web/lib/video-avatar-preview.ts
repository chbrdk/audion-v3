/**
 * Normalize provider Face/Avatar preview URLs for the magazine picker.
 * Tavus list faces exposes thumbnail_video_url (video); stills when present.
 */

export function pickPreviewString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return null
}

function isLikelyVideoUrl(url: string): boolean {
  return /\.(mp4|webm|mov)(\?|#|$)/i.test(url) || /\/video\//i.test(url)
}

function pickNestedUrl(value: unknown, ...keys: string[]): string | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  return pickPreviewString(...keys.map((key) => record[key]))
}

/** Prefer stills for <img>; fall back to video thumbs for <video muted>. */
export function pickVideoAvatarPreview(raw: Record<string, unknown>): {
  previewUrl: string | null
  previewKind: 'image' | 'video' | null
} {
  const image = pickPreviewString(
    raw.thumbnail_image_url,
    raw.image_url,
    raw.preview_url,
    raw.thumbnail_url,
    raw.poster_url,
    raw.avatar_url,
    pickNestedUrl(raw.thumbnail, 'url', 'image_url', 'src'),
    pickNestedUrl(raw.image, 'url', 'src'),
    pickNestedUrl(raw.preview, 'url', 'image_url', 'src'),
    pickNestedUrl(raw.media, 'thumbnail_url', 'image_url', 'preview_url', 'url'),
  )
  if (image && !isLikelyVideoUrl(image)) {
    return { previewUrl: image, previewKind: 'image' }
  }
  const video = pickPreviewString(
    raw.thumbnail_video_url,
    raw.preview_video_url,
    raw.video_url,
    image && isLikelyVideoUrl(image) ? image : null,
    pickNestedUrl(raw.thumbnail, 'video_url', 'mp4'),
    pickNestedUrl(raw.media, 'video_url', 'thumbnail_video_url'),
  )
  if (video) return { previewUrl: video, previewKind: 'video' }
  if (image) return { previewUrl: image, previewKind: 'image' }
  return { previewUrl: null, previewKind: null }
}
