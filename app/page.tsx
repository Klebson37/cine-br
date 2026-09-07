import { Catalogo, type CatalogoParams } from '@/components/catalog/Catalogo'
import { ProviderPanel } from '@/components/filters/ProviderPanel'
import { GettingStarted } from '@/components/layout/GettingStarted'
import { FILMES } from '@/lib/catalog/media'
import { getRegionProviders } from '@/lib/catalog/queries'
import { getCurrentUser, getMarks } from '@/lib/marks/queries'
import { readSelectedProviderIds } from '@/lib/preferences.server'

interface HomePageProps {
  searchParams: Promise<CatalogoParams & { providers?: string }>
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams

  const [selectedIds, allProviders, genres, marks, user] = await Promise.all([
    readSelectedProviderIds(),
    getRegionProviders(),
    FILMES.genres(),
    getMarks(),
    getCurrentUser(),
  ])

  const selectedProviders = allProviders.filter((p) =>
    selectedIds.includes(p.id),
  )

  return (
    <>
      {params.providers === 'open' && (
        <div className="wrap pb-10 pt-8">
          {/* getRegionProviders já devolve ordenado por prioridade no BR.
              São 86 no total; os 20 primeiros cobrem todos os relevantes. */}
          <ProviderPanel
            providers={allProviders.slice(0, 20)}
            selectedIds={selectedIds}
          />
        </div>
      )}

      {/* Só para quem ainda não escolheu streamings: a escolha é o primeiro
          passo, e fazê-la já é o sinal de que a explicação cumpriu o papel.
          Não aparece com o painel aberto, para não empilhar duas caixas. */}
      {selectedIds.length === 0 && params.providers !== 'open' && (
        <div className="wrap pb-10 pt-8">
          <GettingStarted />
        </div>
      )}

      <Catalogo
        api={FILMES}
        aba="discover"
        params={params}
        selectedProviders={selectedProviders}
        selectedIds={selectedIds}
        genres={genres}
        marks={marks}
        signedIn={user !== null}
      />
    </>
  )
}
