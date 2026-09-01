/**
 * Vaillant **Group** Collection — UC1 research personas (AUDION seed payloads).
 * Project: proj-vaillant-group-mtb6qr6b · NOT consumer-only Vaillant project.
 * @see knowledge/vaillant-group-mafo-seed.md
 */

import type { PersonaDetail } from '@audion-v3/contracts'

export const VAILLANT_GROUP_PLATFORM_PROJECT_ID =
  'f3d27e9f-d14c-4880-82be-3ca31c051173' as const

export const VAILLANT_GROUP_AUDION_PROJECT_ID = 'proj-vaillant-group-mtb6qr6b' as const

export type VaillantGroupTargetGroupSeed = {
  id: string
  name: string
  description: string
  segmentKey: string
}

export const VAILLANT_GROUP_UC1_TARGET_GROUPS: VaillantGroupTargetGroupSeed[] = [
  {
    id: 'tg-vg-altbau-familie',
    name: 'Familie · unsaniertes Bestandsgebäude',
    description: 'Eigenheim, älterer Bestand, unsicher ob Wärmepumpe technisch passt.',
    segmentKey: 'altbau_familie',
  },
  {
    id: 'tg-vg-heizungstausch',
    name: 'Eigentümer · Heizungstausch steht an',
    description: 'Gasheizung end-of-life, Zeitdruck, vergleicht Optionen.',
    segmentKey: 'heizungstausch',
  },
  {
    id: 'tg-vg-neubau-tech',
    name: 'Neubau · technikaffin',
    description: 'Plant Neubau/Sanierung, vergleicht Systeme datengetrieben.',
    segmentKey: 'neubau_tech',
  },
  {
    id: 'tg-vg-preissensibel',
    name: 'Preissensibler Haushalt',
    description: 'Fokus TCO, Förderung, monatliche Belastung.',
    segmentKey: 'preissensibel',
  },
  {
    id: 'tg-vg-gas-skeptiker',
    name: 'Gasheizung · skeptisch',
    description: 'Zufrieden mit Gas, braucht starke Argumente für Umstieg.',
    segmentKey: 'gas_skeptiker',
  },
  {
    id: 'tg-vg-oeko-modernisierer',
    name: 'Ökologisch motivierter Modernisierer',
    description: 'Klimaziele im Fokus, will Planungssicherheit.',
    segmentKey: 'oeko_modernisierer',
  },
]

function basePersona(
  id: string,
  name: string,
  role: string,
  bio: string,
  frustrations: string[],
  goals: string[],
): PersonaDetail {
  return {
    id,
    name,
    role,
    projectId: VAILLANT_GROUP_AUDION_PROJECT_ID,
    status: 'ready',
    archetype: 'Eigenheimbesitzer',
    updatedAt: '2026-09-01T12:00:00.000Z',
    avatarUrl: null,
    age: null,
    location: 'Deutschland',
    bio,
    gender: null,
    attentionSpan: null,
    colorPalette: [],
    mediaAffinity: null,
    confidence: null,
    techLiteracy: null,
    emotionalBaseline: null,
    stressTriggers: frustrations,
    motivations: goals.map((label, i) => ({ label, type: i % 2 === 0 ? 'intrinsic' : 'extrinsic' })),
    traits: {},
    interests: [],
    values: [],
    socialMediaUsage: [],
    communicationStyle: null,
    visuals: null,
    profileDe: null,
    headlineDe: null,
    knowledgeEntries: [],
    documents: [],
    tavusReplicaId: null,
    tavusPersonaId: null,
    tavusLanguage: null,
    goals: goals.map((label, priority) => ({ label, priority })),
    frustrations: frustrations.map((label) => ({ label, evidenceCount: 0 })),
    channels: [],
    sections: [],
    journeyBehavior: {
      dimensionOverrides: {
        riskAversion: 0.7,
        trustSkepticism: 0.65,
        detailOrientation: 0.6,
      },
      dos: [],
      donts: [],
    },
  }
}

/** UC1 homeowner personas for qualitative barrier research. */
export const VAILLANT_GROUP_UC1_PERSONAS: PersonaDetail[] = [
  basePersona(
    'persona-vg-sandra-altbau',
    'Sandra Müller',
    'Hausbesitzerin · Altbau',
    'Familie in unsaniertem Reihenhaus (Bj. 1978). Überlegt Wärmepumpe, hört aber oft „Altbau geht nicht".',
    ['Technische Unsicherheit', 'Installateur finden', 'Stromkosten-Furcht'],
    ['Verlässliche Wärme im Altbau', 'Förderung nutzen', 'Planungssicherheit'],
  ),
  basePersona(
    'persona-vg-thomas-tausch',
    'Thomas Weber',
    'Eigentümer · Heizungstausch',
    'Gasheizung fällt in 12 Monaten aus. Muss schnell entscheiden, hat wenig Zeit für Recherche.',
    ['Zeitdruck', 'Informationsflut', 'Preisvergleich opaque'],
    ['Schnelle, sichere Entscheidung', 'Wirtschaftlichkeit verstehen'],
  ),
  basePersona(
    'persona-vg-lisa-neubau',
    'Lisa Hartmann',
    'Neubau-Planerin',
    'Plant Effizienzhaus, vergleicht Systeme anhand Datenblättern und SCOP-Werten.',
    ['Marketing vs. Realität', 'Komplexe Produktlandschaft'],
    ['Optimales System für Neubau', 'Digitale Planungstools'],
  ),
  basePersona(
    'persona-vg-meier-budget',
    'Frank Meier',
    'Preissensibler Haushalt',
    'Fokus auf monatliche Rate und Förderung — ohne versteckte Kosten.',
    ['Hohe Investition', 'Unklare Förderbedingungen', 'Amortisation'],
    ['Planbare Gesamtkosten', 'Transparente Angebote'],
  ),
  basePersona(
    'persona-vg-krause-gas',
    'Helmut Krause',
    'Gasheizungs-Besitzer',
    'Zufrieden mit Gas, skeptisch gegenüber „Hype" Wärmepumpe.',
    ['Vertrauen in bewährtes System', 'Angst vor teuren Reparaturen'],
    ['Nur wechseln wenn klar besser', 'Verlässlicher Fachhandwerker'],
  ),
  basePersona(
    'persona-vg-jana-oeko',
    'Jana Schmitt',
    'Öko-Modernisiererin',
    'Will CO₂ reduzieren, braucht aber Klarheit zu Eignung und Betriebskosten.',
    ['Grüne Claims ohne Beleg', 'Komplexe Anträge'],
    ['Klimawirkung', 'Einfacher Modernisierungspfad'],
  ),
]

export const VAILLANT_GROUP_UC1_RESEARCH_PROMPTS = [
  'Was würde dich aktuell davon abhalten, eine Wärmepumpe zu kaufen?',
  'Welche Information würde dir bei der Entscheidung am meisten helfen?',
  'Welche Risiken siehst du?',
  'Wem würdest du bei dieser Entscheidung vertrauen?',
  'Welche Rolle spielt dein Heizungsinstallateur?',
] as const
