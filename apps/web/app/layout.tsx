import './globals.css'
import type { Metadata } from 'next'
import { resolveThemeId } from '@msqdx/ui'
import { AppProviders } from '../components/app-providers'
import { paths } from '../lib/paths'

export const metadata: Metadata = {
  title: 'AUDION v3',
  description: 'Spec-driven persona workspace rebuild',
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang={paths.defaultLocale}
      data-theme={resolveThemeId(paths.defaultTheme)}
      suppressHydrationWarning
    >
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  )
}
