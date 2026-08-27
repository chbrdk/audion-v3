'use client'

import { useMemo } from 'react'
import { BrandCornerProductMenu } from '../lib/msqdx-ui-shell'
import { paths } from '../lib/paths'
import {
  getStaticProductSwitcherItems,
  plexonProductsCatalogUrl,
} from '../lib/platform-product-switcher'
import { useUserPrefs } from '../lib/user-prefs'

export function ShellBrandCorner() {
  const { t } = useUserPrefs()
  const items = useMemo(() => getStaticProductSwitcherItems(), [])
  const catalogUrl = useMemo(() => plexonProductsCatalogUrl(), [])

  return (
    <BrandCornerProductMenu
      label={paths.brandLabel}
      currentProductId={paths.productId}
      items={items}
      menuLabel={t('shell.productMenu')}
      footer={
        catalogUrl ? (
          <a href={catalogUrl} target="_blank" rel="noopener noreferrer">
            {t('shell.allProducts')}
          </a>
        ) : null
      }
    />
  )
}
