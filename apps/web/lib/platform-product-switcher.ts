import type { ProductSwitcherItem } from '../../../../msqdx-ui/packages/ui/src/components/ProductSwitcherPanel'
import { paths } from './paths'
import { getPlexonPublicBaseUrl } from './platform-assistant-paths'

function productOrigin(envKey: string, fallback: string): string {
  const raw = process.env[envKey]?.trim()
  return (raw || fallback).replace(/\/$/, '')
}

/** Static federated product list for BrandCorner launcher (Phase 1 — no Plexon entitlements fetch). */
export function getStaticProductSwitcherItems(): ProductSwitcherItem[] {
  const plexon = getPlexonPublicBaseUrl() || paths.ecosystemStagingPlexon
  const items: ProductSwitcherItem[] = [
    { id: 'plexon', label: 'PLEXON', href: plexon },
    {
      id: 'audion',
      label: 'AUDION',
      href: productOrigin(paths.envAudionPublicUrl, paths.ecosystemStagingAudion),
    },
    {
      id: 'checkion',
      label: 'CHECKION',
      href: productOrigin(paths.envCheckionPublicUrl, paths.ecosystemStagingCheckion),
    },
    {
      id: 'brandion',
      label: 'BRANDION',
      href: productOrigin(paths.envBrandionPublicUrl, paths.ecosystemStagingBrandion),
    },
    {
      id: 'creation',
      label: 'CREATION',
      href: productOrigin(paths.envCreationPublicUrl, paths.ecosystemStagingCreation),
    },
    {
      id: 'echon',
      label: 'ECHON',
      href: productOrigin(paths.envEchonPublicUrl, paths.ecosystemStagingEchon),
    },
  ]
  return items.filter((item) => Boolean(item.href))
}

export function plexonProductsCatalogUrl(): string | null {
  const base = getPlexonPublicBaseUrl() || paths.ecosystemStagingPlexon
  if (!base) return null
  return `${base.replace(/\/$/, '')}${paths.plexonProductsPath}`
}
