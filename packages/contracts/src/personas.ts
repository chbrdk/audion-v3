export type PersonaStatus = 'draft' | 'ready' | 'archived'

export type PersonaSummary = {
  id: string
  name: string
  role: string
  projectId: string | null
  status: PersonaStatus
  archetype: string | null
  updatedAt: string | null
  /** Public avatar / portrait URL when available */
  avatarUrl: string | null
}

export type PersonaList = {
  items: PersonaSummary[]
  total: number
  page: number
  pageSize: number
}

export type PersonaSection = {
  /** Stable accordion/editor id — generated client-side when missing on read. */
  id?: string
  title: string
  body: string
}

export type PersonaGoal = {
  label: string
  priority: number
}

export type PersonaFrustration = {
  label: string
  evidenceCount: number
}

export type PersonaCommunicationStyle = {
  vocabulary: string[]
  sentenceStructure: string | null
  skepticismLevel: number | null
}

export type PersonaVisualTile = {
  id: string
  imageUrl: string
  category: string
  caption: string | null
}

export type PersonaVisuals = {
  styleKeywords: string[]
  tiles: PersonaVisualTile[]
}

export type PersonaProfileDe = {
  headline?: string | null
  bio?: string | null
  interests?: string[]
  values?: string[]
  goals?: Array<{ label: string; priority: number }>
  frustrations?: Array<{ label: string; evidenceCount: number }>
  channels?: string[]
  socialMediaUsage?: string[]
  communicationStyle?: PersonaCommunicationStyle | null
  traits?: Record<string, number>
}

export type PersonaDetail = PersonaSummary & {
  age: string | null
  location: string | null
  bio: string | null
  gender: string | null
  attentionSpan: string | null
  colorPalette: string[]
  mediaAffinity: number | null
  confidence: number | null
  traits: Record<string, number>
  interests: string[]
  values: string[]
  socialMediaUsage: string[]
  communicationStyle: PersonaCommunicationStyle | null
  goals: PersonaGoal[]
  frustrations: PersonaFrustration[]
  channels: string[]
  sections: PersonaSection[]
  visuals: PersonaVisuals | null
  /** German mirror of profile bands (EN remains canonical). */
  profileDe: PersonaProfileDe | null
  headlineDe: string | null
  knowledgeEntries: import('./knowledge-entries').KnowledgeEntry[]
  documents: import('./knowledge-entries').DocumentSource[]
}

/** Create / PATCH body — magazine edit wave */
export type PersonaWritePayload = {
  name: string
  role: string
  status?: PersonaStatus
  archetype?: string | null
  age?: string | null
  location?: string | null
  bio?: string | null
  gender?: string | null
  attentionSpan?: string | null
  colorPalette?: string[]
  mediaAffinity?: number | null
  confidence?: number | null
  traits?: Record<string, number>
  interests?: string[]
  values?: string[]
  socialMediaUsage?: string[]
  communicationStyle?: PersonaCommunicationStyle | null
  goals?: PersonaGoal[]
  frustrations?: PersonaFrustration[]
  channels?: string[]
  /** Magazine Notes cards (Mindset, Context, …) — same Accordion + TipTap pattern as project knowledge. */
  sections?: PersonaSection[]
  visuals?: PersonaVisuals | null
  /** Hero portrait URL — empty string clears to initials. */
  avatarUrl?: string | null
  projectId?: string | null
  profileDe?: PersonaProfileDe | null
  headlineDe?: string | null
  knowledgeEntries?: import('./knowledge-entries').KnowledgeEntry[]
  documents?: import('./knowledge-entries').DocumentSource[]
}
