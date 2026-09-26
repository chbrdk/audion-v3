/** Runtime env reader — Coolify-safe (dynamic key). */

export function runtimeEnv(name: string): string {
  if (typeof process === 'undefined') return ''
  try {
    const v = process.env[name]
    return typeof v === 'string' ? v.trim() : ''
  } catch {
    return ''
  }
}
