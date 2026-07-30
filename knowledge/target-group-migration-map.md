# Target group migration map (AUDION-v2 → v3)

| Legacy | v3 |
|--------|----|
| `/admin/target-groups-v2` | `/target-groups`, `/target-groups/[id]` |
| `TargetGroupListItem` | `TargetGroupSummary` |
| `TargetGroupResponse` | `TargetGroupDetail` (+ `linkedPersonas`) |
| Glass admin sections / sources / knowledge | Deferred |
| `GET /target-groups` | Same + fixture store |

Contracts: `packages/contracts/src/target-groups.ts`
Fixtures: `apps/web/lib/fixtures/target-groups.ts`
