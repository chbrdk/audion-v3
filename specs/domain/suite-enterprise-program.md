# AUDION — Suite Enterprise Program

**Status:** Accepted (program) — 2026-09-25. E4/E1 Plexon-Clients (`plexon-suite-audit`, `plexon-collection-activity`); Hook: nativer Research-Lauf `completed` (Audit mit Session-Actor). Destillat-Publish unverändert.  
**Programm:** `plexon-v3/specs/domain/suite-enterprise-program.md`  
**Federation:** `2026-05-plexon-federation-v3`

## Pflicht

| Welle | AUDION liefert |
|---|---|
| E1 | Destillat letzter Persona, Journey und Study (Titel, Status, Deep-Link) für das Lagebild. |
| E4 | Audit-Ereignis, wenn eine Study startet oder ein Report entsteht. `actorUserId` ist der Session-Nutzer. |
| E5 | Study blockt das Launch-Gate nur, wenn der Flow sie als Pflicht markiert. Sonst ist sie Hinweis. |
| E6 | Persona und Site-Topics wie in `plexon-v3/specs/domain/persona-page-relevance-wave2.md`. Diese Datei ändert das Ranking nicht. |
| E7 | Stabile Persona- und Zielgruppen-IDs für `personaRefs` am Kampagnenbrief. |
| E8 | Dieselbe Persona-Referenz für den Wettbewerbsraum und die Krisenvorlage. |

## Annahme

- Persona-Chat bleibt in AUDION.
- Voice bleibt ein eigenes Thema und ist keine Enterprise-Welle.
- Ein Study-Report wird versioniert, sobald E5 ihn als Pflichtbeleg nutzt: neue Fassung ersetzt die alte nicht still.

## Acceptance

Ein Pflicht-Study ohne abgeschlossene Evaluation hält das Launch-Gate offen. Ein optionaler Study-Schritt ohne Agent-URL wird als übersprungen mit Grund `agent_unconfigured` gemeldet, nicht als bestanden.
