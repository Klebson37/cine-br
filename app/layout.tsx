import type { Metadata } from 'next'
import { Footer } from '@/components/layout/Footer'
import { Header } from '@/components/layout/Header'
import { readSelectedProviderIds } from '@/lib/preferences'
import './globals.css'

export const metadata: Metadata = {
  title: 'CineBR — o que dá pra assistir hoje',
  description: 'Filmes incluídos nos streamings que você já assina, no Brasil.',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const selected = await readSelectedProviderIds()

  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-neutral-950 text-neutral-100 antialiased">
        <Header selectedCount={selected.length} />
        <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
