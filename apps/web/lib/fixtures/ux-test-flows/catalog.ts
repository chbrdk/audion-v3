/**
 * UX Test Flow fixtures — catalog of 10 + full graphs for scenarios 1–3.
 * @see specs/domain/ux-test-flow-model.md
 */

import type { SoftScoreCoreKey, UxTestFlow } from '@audion-v3/contracts'
import { paths } from '../../paths'

const CORE_SOFT: SoftScoreCoreKey[] = [
  'ease',
  'findability',
  'clarity',
  'usefulness',
  'likelihood',
  'overall',
]

/** Scenario 1 — Erstkontakt / Gefühlsgate (adaptiv) */
export const FLOW_FEELING_GATE: UxTestFlow = {
  id: 'flow-feeling-gate',
  name: 'Erstkontakt mit Gefühlsgate',
  description:
    'Seite ansehen → Gefühl nennen → bei hoher Frustration abbrechen und erklären, sonst konkrete Aufgabe.',
  scenarioIndex: 1,
  primaryArchetype: 'first_impression',
  nodeKindsUsed: ['start', 'prompt', 'observe', 'measure', 'gate', 'message', 'abandon', 'action', 'success'],
  domainProfileId: 'core',
  softScoreKeys: CORE_SOFT,
  defaultWaveKey: 'flow-feeling-gate',
  compileReady: true,
  nodes: [
    {
      id: 'n-start',
      kind: 'start',
      label: 'Start',
      urlKey: paths.labTemplateFindabilityStartUrlKey,
      personaId: paths.personaLabImpatientPersonaId,
      personaName: 'Alex Lab Ungeduldig',
      segment: 'owner_upgrade',
      maxSteps: 12,
    },
    {
      id: 'n-look',
      kind: 'observe',
      label: 'Orientieren',
      text: 'Schau dich etwa eine Minute um. Klicke noch nichts Wichtiges.',
      observeSeconds: 60,
    },
    {
      id: 'n-feel',
      kind: 'measure',
      label: 'Gefühl',
      text: 'Wie fühlst du dich jetzt? klar / unsicher / frustriert — sage es laut.',
      measureKey: 'ease',
    },
    {
      id: 'n-gate',
      kind: 'gate',
      label: 'Frustration hoch?',
      gateCondition: 'frustration_high',
    },
    {
      id: 'n-msg-abort',
      kind: 'message',
      label: 'Abbruchhinweis',
      text: 'Du fühlst dich stark frustriert oder überfordert.',
    },
    {
      id: 'n-abandon',
      kind: 'abandon',
      label: 'Ehrlich abbrechen',
      text: 'Brich ab und erkläre kurz warum (was hat dich überfordert?).',
    },
    {
      id: 'n-task',
      kind: 'action',
      label: 'Aufgabe',
      text: 'Finde auf der Seite einen klaren nächsten Schritt oder Link, der für dich sinnvoll wäre. Nenne ihn laut.',
    },
    {
      id: 'n-ok',
      kind: 'success',
      label: 'Fertig',
      text: 'Kurzfazit: Was war klar, was nicht?',
    },
  ],
  edges: [
    { id: 'e1', from: 'n-start', to: 'n-look', kind: 'then' },
    { id: 'e2', from: 'n-look', to: 'n-feel', kind: 'then' },
    { id: 'e3', from: 'n-feel', to: 'n-gate', kind: 'then' },
    { id: 'e4', from: 'n-gate', to: 'n-msg-abort', kind: 'when' },
    { id: 'e5', from: 'n-msg-abort', to: 'n-abandon', kind: 'then' },
    { id: 'e6', from: 'n-gate', to: 'n-task', kind: 'otherwise' },
    { id: 'e7', from: 'n-task', to: 'n-ok', kind: 'then' },
  ],
}

/** Scenario 2 — Auffindbarkeit */
export const FLOW_FINDABILITY: UxTestFlow = {
  id: 'flow-findability',
  name: 'Auffindbarkeit ohne Spoiler',
  description:
    'Von einer Startseite zur Zielseite navigieren — ohne Deeplink und ohne UI-Label-Spoiler.',
  scenarioIndex: 2,
  primaryArchetype: 'findability',
  nodeKindsUsed: ['start', 'prompt', 'action', 'gate', 'success', 'abandon', 'measure'],
  domainProfileId: 'core',
  softScoreKeys: CORE_SOFT,
  defaultWaveKey: 'flow-findability',
  compileReady: true,
  successCriteria: { kind: 'url_match', pattern: 'example\\.com' },
  nodes: [
    {
      id: 'n-start',
      kind: 'start',
      label: 'Start Home',
      urlKey: paths.labTemplateFindabilityStartUrlKey,
      personaId: paths.personaLabImpatientPersonaId,
      personaName: 'Alex Lab Ungeduldig',
      segment: 'owner_upgrade',
      maxSteps: 10,
    },
    {
      id: 'n-prompt',
      kind: 'prompt',
      label: 'Auftrag',
      text: 'Finde den Weg zur Domain example.com. Nutze nur sichtbare Links auf der Seite — keine direkte URL eintippen / kein navigate-Cheat.',
    },
    {
      id: 'n-nav',
      kind: 'action',
      label: 'Navigieren',
      text: 'Navigiere ehrlich. Denke laut, was du siehst und warum du klickst.',
    },
    {
      id: 'n-gate',
      kind: 'gate',
      label: 'Ziel-URL?',
      gateCondition: 'url_match',
      pattern: 'example\\.com',
    },
    {
      id: 'n-ok',
      kind: 'success',
      label: 'Ziel erreicht',
      text: 'Du bist auf example.com gelandet.',
    },
    {
      id: 'n-fail',
      kind: 'abandon',
      label: 'Nicht gefunden',
      text: 'Brich ehrlich ab und sage, was gefehlt hat (kein Link, unklar, …).',
    },
    {
      id: 'n-seq',
      kind: 'measure',
      label: 'SEQ Auffindbarkeit',
      text: 'Wie leicht war das Auffinden von 1 (sehr schwer) bis 5 (sehr leicht)?',
      measureKey: 'findability',
    },
  ],
  edges: [
    { id: 'e1', from: 'n-start', to: 'n-prompt', kind: 'then' },
    { id: 'e2', from: 'n-prompt', to: 'n-nav', kind: 'then' },
    { id: 'e3', from: 'n-nav', to: 'n-gate', kind: 'then' },
    { id: 'e4', from: 'n-gate', to: 'n-ok', kind: 'when' },
    { id: 'e5', from: 'n-gate', to: 'n-fail', kind: 'otherwise' },
    { id: 'e6', from: 'n-ok', to: 'n-seq', kind: 'then' },
    { id: 'e7', from: 'n-fail', to: 'n-seq', kind: 'then' },
  ],
}

/** Scenario 3 — Consent gate */
export const FLOW_CONSENT_GATE: UxTestFlow = {
  id: 'flow-consent-gate',
  name: 'Consent / Datenschutz-Gate',
  description:
    'Tool erst nach Bestätigung externer Inhalte nutzbar — Hemmung, Ablehnung oder Bestätigen.',
  scenarioIndex: 3,
  primaryArchetype: 'comprehension',
  nodeKindsUsed: ['start', 'observe', 'gate', 'prompt', 'action', 'abandon', 'success'],
  domainProfileId: 'core',
  softScoreKeys: CORE_SOFT,
  defaultWaveKey: 'flow-consent-gate',
  compileReady: true,
  nodes: [
    {
      id: 'n-start',
      kind: 'start',
      label: 'Start Tool',
      urlKey: paths.boschEbikeHaendlersucheUrlKey,
      personaId: paths.personaLabImpatientPersonaId,
      personaName: 'Alex Lab Ungeduldig',
      segment: 'purchase_intent',
      maxSteps: 14,
    },
    {
      id: 'n-look',
      kind: 'observe',
      label: 'Erste Sicht',
      text: 'Schau die Seite an. Ist eine Karte/Suche blockiert oder ein Bestätigen-Dialog sichtbar?',
      observeSeconds: 45,
    },
    {
      id: 'n-prompt-consent',
      kind: 'prompt',
      label: 'Consent bedenken',
      text: 'Wenn „Externen Inhalt bestätigen“ (o.ä.) erscheint: Was hält dich ab? Was bräuchtest du zum Bestätigen? Sage das laut.',
    },
    {
      id: 'n-gate',
      kind: 'gate',
      label: 'Consent angenommen?',
      gateCondition: 'consent_accepted',
    },
    {
      id: 'n-accept',
      kind: 'action',
      label: 'Bestätigen & suchen',
      text: 'Bestätige den externen Inhalt und prüfe kurz, ob die Händlersuche/Karte nutzbar wird. Nenne einen sinnvollen nächsten Schritt.',
    },
    {
      id: 'n-ok',
      kind: 'success',
      label: 'Nutzbar',
      text: 'Tool nach Consent nutzbar — Kurzfazit.',
    },
    {
      id: 'n-reject',
      kind: 'abandon',
      label: 'Ablehnen / Abwandern',
      text: 'Wenn du nicht bestätigst oder zu Google abwanderst: erkläre warum und brich ab.',
    },
  ],
  edges: [
    { id: 'e1', from: 'n-start', to: 'n-look', kind: 'then' },
    { id: 'e2', from: 'n-look', to: 'n-prompt-consent', kind: 'then' },
    { id: 'e3', from: 'n-prompt-consent', to: 'n-gate', kind: 'then' },
    { id: 'e4', from: 'n-gate', to: 'n-accept', kind: 'when' },
    { id: 'e5', from: 'n-accept', to: 'n-ok', kind: 'then' },
    { id: 'e6', from: 'n-gate', to: 'n-reject', kind: 'otherwise' },
  ],
}

const CATALOG_ONLY: Omit<UxTestFlow, 'nodes' | 'edges'>[] = [
  {
    id: 'flow-task-goal',
    name: 'Konkrete Aufgabe im Tool',
    description: 'Ein klares Ziel im Produkt erreichen (Liste finden, Formular, Auswahl).',
    scenarioIndex: 4,
    primaryArchetype: 'task_goal',
    nodeKindsUsed: ['start', 'prompt', 'action', 'gate', 'measure', 'success', 'abandon'],
    defaultWaveKey: 'flow-task-goal',
    compileReady: false,
  },
  {
    id: 'flow-comprehension',
    name: 'Logik verstehen (Filter / grau)',
    description: 'Erklären warum etwas disabled ist — oder ehrlich „unklar“ sagen.',
    scenarioIndex: 5,
    primaryArchetype: 'comprehension',
    nodeKindsUsed: ['start', 'prompt', 'action', 'gate', 'measure'],
    defaultWaveKey: 'flow-comprehension',
    compileReady: false,
  },
  {
    id: 'flow-recovery',
    name: 'Fehler & wiederfinden',
    description: 'Vom falschen Pfad zurück zur sinnvollen Ansicht.',
    scenarioIndex: 6,
    primaryArchetype: 'recovery',
    nodeKindsUsed: ['start', 'prompt', 'action', 'gate', 'measure'],
    defaultWaveKey: 'flow-recovery',
    compileReady: false,
  },
  {
    id: 'flow-segment-contrast',
    name: 'Zwei Personas parallel',
    description: 'Gleiche Aufgabe, ungeduldig vs. geduldig (oder Segmente).',
    scenarioIndex: 7,
    primaryArchetype: 'segment_contrast',
    nodeKindsUsed: ['start', 'prompt', 'action', 'measure'],
    defaultWaveKey: 'flow-segment-contrast',
    compileReady: false,
  },
  {
    id: 'flow-next-step',
    name: 'Nächster Schritt nach der Prüfung',
    description: 'Was danach? CTA für Händler/Kauf/Support — da oder fehlt.',
    scenarioIndex: 8,
    primaryArchetype: 'outcome_next_step',
    nodeKindsUsed: ['start', 'prompt', 'observe', 'action', 'gate', 'measure'],
    defaultWaveKey: 'flow-next-step',
    compileReady: false,
  },
  {
    id: 'flow-end-to-end',
    name: 'Mehrstufiger End-to-End',
    description: 'Orientieren → Aufgabe → Vertiefung → Abschluss, mit Zwischen-Gates.',
    scenarioIndex: 9,
    primaryArchetype: 'end_to_end',
    nodeKindsUsed: ['start', 'prompt', 'observe', 'action', 'gate', 'measure', 'success', 'abandon'],
    defaultWaveKey: 'flow-end-to-end',
    compileReady: false,
  },
  {
    id: 'flow-moderated-outline',
    name: 'Moderiert-light Leitfaden',
    description: 'Beobachtungsfenster + Moderationsfragen als Checkliste; Agent optional.',
    scenarioIndex: 10,
    primaryArchetype: 'first_impression',
    nodeKindsUsed: ['start', 'prompt', 'observe', 'message', 'measure', 'action'],
    defaultWaveKey: 'flow-moderated-outline',
    compileReady: false,
  },
]

export const UX_TEST_FLOWS: UxTestFlow[] = [
  FLOW_FEELING_GATE,
  FLOW_FINDABILITY,
  FLOW_CONSENT_GATE,
  ...CATALOG_ONLY.map((c) => ({ ...c, nodes: null, edges: null })),
]
