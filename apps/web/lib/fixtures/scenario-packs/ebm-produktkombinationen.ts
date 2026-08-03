/**
 * EBM Produktkombinationen ScenarioPack — port of AUDION-v2 journey-tasks.json.
 * URLs resolve via paths keys (never hardcoded at call sites).
 */

import type { SoftScoreKey, UxScenarioPack } from '@audion-v3/contracts'
import { EBM_HYPOTHESES } from '../ux-studies'

const SOFT_KEYS: SoftScoreKey[] = [
  'Q1_nuetzlichkeit',
  'Q2_bedienbarkeit',
  'Q3_filterlogik',
  'Q4_auffindbarkeit',
  'Q5_produktnah_vs_tool',
  'Q6_nutzungswahrscheinlichkeit',
  'Q7_gesamteindruck',
]

export const EBM_PRODUKTKOMBINATIONEN_PACK: UxScenarioPack = {
  id: 'pack-ebm-produktkombinationen',
  name: 'EBM Produktkombinationen UX-Test',
  description:
    'Unmoderated remote UX approximation via AUDION UX Journey Agent (Testbirds Leitfaden v1.3). Soft-Q and hypotheses are evidence-gated (validEvidence).',
  sourceGuide: 'EBM-Testleitfaden Produktkombinationen-Tool v1.3 (Testbirds)',
  targetUrlKey: 'bosch.ebike.produktkombinationen',
  projectId: 'proj-audion-core',
  hypothesisTemplates: EBM_HYPOTHESES.map((h) => ({ ...h })),
  softScoreKeys: SOFT_KEYS,
  fFragenPrompts: [
    'F2.1 Was ist der Zweck dieser Seite?',
    'F2.2 Was fällt dir als Erstes auf?',
    'F5.1 Würdest du das Tool weiterempfehlen — warum?',
    'F5.2 Was fehlte für eine sichere Entscheidung?',
  ],
  defaultWaveKey: 'retest-from-pack',
  runs: [
    {
      runKey: 'A-erstkontakt',
      leitfadenBlock: '2 Erstkontakt & freie Exploration',
      personaId: 'persona-alex-nachruester',
      personaName: 'Alex Nachrüster',
      segment: 'owner_upgrade',
      urlKey: 'bosch.ebike.produktkombinationen',
      maxSteps: 12,
      task: 'Du bist ein eBike-Besitzer und öffnest zum ersten Mal die Bosch Produktkombinationen-Seite. Nimm dir etwa eine Minute Zeit: schau dich um, scrolle vorsichtig, aber klicke noch nichts Wichtiges und ändere keine Filterauswahl. Denke laut (auf Deutsch) und beantworte intern: (F2.1) Was ist der Zweck dieser Seite – was kann man hier tun? (F2.2) Was fällt dir als Erstes auf und was zieht deine Aufmerksamkeit? Beschreibe Verwirrung oder Überforderung ehrlich. Beende mit einer kurzen Zusammenfassung deines ersten Eindrucks.',
    },
    {
      runKey: 'B-aufgabe1-nachruesten',
      leitfadenBlock: '3 Aufgabenbasiertes Testing – Aufgabe 1',
      personaId: 'persona-alex-nachruester',
      personaName: 'Alex Nachrüster',
      segment: 'owner_upgrade',
      urlKey: 'bosch.ebike.produktkombinationen',
      maxSteps: 40,
      task: 'Aufgabe 1 aus dem UX-Testleitfaden: Du hast ein eBike mit einem Bosch Performance Line Motor und möchtest wissen, welche Displays dazu kompatibel sind. Nutze das Produktkombinationen-Tool auf dieser Seite, um die Frage zu beantworten. Denke laut auf Deutsch: erkläre jeden Schritt, was du anklickst und warum. Achte besonders darauf, ob Optionen ausgeblendet werden und ob du verstehst warum (Hypothese Matrix-Filter). Am Ende beantworte: (F3.1) Wie einfach/schwer war die Antwort zu finden? (F3.2) Hat sich das Tool wie erwartet verhalten – was hat überrascht? (F3.3) Gab es einen Moment ohne klaren nächsten Schritt? (F3.4) Hast du das Gefühl, deine Frage beantwortet bekommen zu haben – was fehlte? Nenne abschließend die Displays, die du als kompatibel gefunden hast (oder dass du keine Antwort gefunden hast).',
    },
    {
      runKey: 'B-aufgabe1-purchase-intent',
      leitfadenBlock: '3 Aufgabe 1 – Segment Matrix (H5)',
      personaId: 'persona-sam-kaufinteressent',
      personaName: 'Sam Kaufinteressent',
      segment: 'purchase_intent',
      urlKey: 'bosch.ebike.produktkombinationen',
      maxSteps: 40,
      task: 'Dieselbe Aufgabe 1 wie für Nachrüster, aber aus Kaufinteressenten-Perspektive (H5): Du planst einen eBike-Kauf und willst wissen, welche Displays zu einem Bosch Performance Line Motor passen. Nutze das Produktkombinationen-Tool. Denke laut auf Deutsch und bewerte Nutzen/Reibung für dein Segment.',
    },
    {
      runKey: 'C-aufgabe2-kombination',
      leitfadenBlock: '3 Aufgabenbasiertes Testing – Aufgabe 2',
      personaId: 'persona-sam-kaufinteressent',
      personaName: 'Sam Kaufinteressent',
      segment: 'purchase_intent',
      urlKey: 'bosch.ebike.produktkombinationen',
      maxSteps: 50,
      task: 'Aufgabe 2 aus dem UX-Testleitfaden: Überprüfe, ob die Kombination aus Motor (Drive Unit), Akku und Display kompatibel ist: Bosch Kiox 400C mit einer Mini Remote Bedieneinheit für ein Cargo-Fahrrad (Cargo Line) mit einem möglichst leistungsfähigen Rahmenakku. Stelle die Kombination aus den vier Komponenten im Tool zusammen. Denke laut auf Deutsch. Beantworte: (F3.5) Konntest du die Kombination zusammenstellen? (F3.4 Ergebnis) Sind sie kompatibel oder nicht – zu welchem Ergebnis bist du gekommen? (F3.6) Hat das Tool erklärt, warum bestimmte Produkte nicht auswählbar waren? (F3.7) Was hätte dir geholfen, die Aufgabe schneller/einfacher zu erledigen? (F3.8) Was würdest du als Nächstes machen? (F3.9) Findest du einen logischen nächsten Schritt (Kauf/weitere Info)? Schliesse mit einem klaren Kompatibilitätsurteil und offenen Fragen.',
    },
    {
      runKey: 'Nav-home-to-tool',
      leitfadenBlock: '4 Navigation (H3 / Q4)',
      personaId: 'persona-alex-nachruester',
      personaName: 'Alex Nachrüster',
      segment: 'owner_upgrade',
      urlKey: 'bosch.ebike.home',
      maxSteps: 20,
      task: 'Starte auf der Bosch eBike Startseite (nicht direkt im Tool). Finde den Weg zum Produktkombinationen-Tool (Service/Produktkombinationen). Denke laut auf Deutsch: (F4.2) Wie leicht findest du den Einstieg? (F4.4) Gab es einen natürlichen Next Step vom Produkt-/Service-Kontext zum Tool? Beschreibe Umwege und Abbruchmomente.',
    },
  ],
}
