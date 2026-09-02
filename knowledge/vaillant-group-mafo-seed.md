# Vaillant Group · AUDION MaFo Seed (UC1 + UC2)

Nur **Vaillant Group** Collection (`f3d27e9f-d14c-4880-82be-3ca31c051173`), AUDION-Mirror `proj-vaillant-group-mtb6qr6b`.

Payloads: `apps/web/lib/fixtures/vaillant-group-mafo-seed.ts`  
Store seed: `apps/web/lib/demo/seed-vaillant-group-mafo-personas.ts` → `seedVaillantGroupMafoStore()`  
Container: `scripts/seed-vaillant-group-mafo-store.ts` (Entrypoint nach Migration)

## Personas (9)

- UC1: 6 Hausbesitzer-Personas (Kaufbarrieren Wärmepumpe)
- UC2: 3 SHK-Fachbetrieb-Personas (Installateur-Perspektive)

## Zielgruppen (8)

Alle mit `projectId: proj-vaillant-group-mtb6qr6b`, Status `active`, verknüpfte Personas.

| ID | Segment | Personas |
|----|---------|----------|
| `tg-vg-altbau-familie` | `altbau_familie` | Sandra Müller |
| `tg-vg-heizungstausch` | `heizungstausch` | Thomas Weber |
| `tg-vg-neubau-tech` | `neubau_tech` | Lisa Hartmann |
| `tg-vg-preissensibel` | `preissensibel` | Frank Meier |
| `tg-vg-gas-skeptiker` | `gas_skeptiker` | Helmut Krause |
| `tg-vg-oeko-modernisierer` | `oeko_modernisierer` | Jana Schmitt |
| `tg-vg-homeowner-decision` | `homeowner_decision` | alle 6 UC1-Personas |
| `tg-vg-fachhandwerker` | `installer_recommendation` | 3 UC2-Installateur-Personas |

Plexon Flow + Knowledge: `plexon-v3/knowledge/vaillant-group-mafo-demo.md`
