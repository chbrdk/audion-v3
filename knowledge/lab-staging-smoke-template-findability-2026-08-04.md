# Staging smoke — domain-agnostic template findability (`0e7167b`)

**Date:** 2026-08-04  
**Web deploy:** `putvwgqq1c9yb30tsqosujde` @ `0e7167b` (deployment `h7oafz4dop7tzn842u8wxmn2`)  
**Agent:** existing `lfv0921nlqzl0qow9xse4it4` (no redeploy required)  
**SoT:** `specs/domain/ux-lab-archetypes.md`

## Gate

Prove **from-pack → Start → Sync → Evaluate** without Bosch URL/target strings. Bosch project id only for staging DB persona binding.

## Pack list (GET `/api/studies/from-pack`)

8 packs; all lab packs expose `archetype`. Template present:

| Pack | Archetype |
|------|-----------|
| `pack-lab-template-findability` | `findability` |

## Live run

| Field | Value |
|-------|-------|
| Study | `study-template-findability-smoke-2026-08-04-msezbpwf` |
| Wave | `wave-template-findability-smoke-2026-08-04-msezbpxz` |
| Pack | `pack-lab-template-findability` |
| Start URL | `https://example.org/` |
| Job | `3e8fd3ed-0e00-4fa1-a987-6f5a5dfb77e8` |
| Steps | **3** |
| finalUrl | `https://example.org/` (no path to example.com — expected) |
| goalReached | **false** |
| deeplinkCheat | **false** |
| validEvidence | **true** |
| Soft-Q shell at seed | Core keys (`ease`…`overall`) |
| Soft-Q after Evaluate | Still rewritten to EBM `Q1`…`Q7` (draft/assist hardcoded) |

## Verdict

- **Pass (plumbing):** registry URL keys, archetype on list, non-Bosch start URL, sync maps `finalUrl`/`deeplinkCheat`, honest no-cheat fail when destination unreachable.
- **Known gap:** Evaluate Soft-Q still always emits EBM profile keys — core/`domainProfileId: core` not yet threaded through `soft-q-draft` / evaluate (alias phase follow-up).

## Correlate (local)

`correlateFindabilityRun` with `successCriteria.url_match = example\.com` → not closer (URL miss) — correct for this honest miss.
