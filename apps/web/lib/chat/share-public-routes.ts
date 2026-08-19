/** Public guest/share chat entry when both ids are present (EQC deep-link). */
export function isPublicChatShareRequest(pathname: string, searchParams: URLSearchParams): boolean {
  if (pathname !== '/chat' && pathname !== '/chat/') return false
  const personaId = searchParams.get('personaId')?.trim() ?? ''
  const projectId = searchParams.get('projectId')?.trim() ?? ''
  return Boolean(personaId && projectId)
}
