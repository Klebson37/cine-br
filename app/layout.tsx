import type { Metadata } from 'next'
import { Archivo } from 'next/font/google'
import { Footer } from '@/components/layout/Footer'
import { Header } from '@/components/layout/Header'
import { readSelectedProviderIds } from '@/lib/preferences.server'
import './globals.css'

/** Uma família só. O eixo de largura faz o papel que um segundo tipo faria:
 *  125% para títulos (letra panorâmica = tela panorâmica), normal na interface. */
const archivo = Archivo({
  subsets: ['latin'],
  axes: ['wdth'],
  variable: '--font-archivo',
  display: 'swap',
})

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
    <html lang="pt-BR" className={archivo.variable}>
      <body className="min-h-screen bg-tinta text-projecao antialiased">
        <Header selectedCount={selected.length} />
        <main className="pb-20">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
