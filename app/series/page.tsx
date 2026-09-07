import { Catalogo, type CatalogoParams } from '@/components/catalog/Catalogo'
import { SERIES } from '@/lib/catalog/media'
import { getRegionProviders } from '@/lib/catalog/queries'
import { readSelectedProviderIds } from '@/lib/preferences.server'

interface SeriesPageProps {
  searchParams: Promise<CatalogoParams>
}

/** As séries dos streamings que a pessoa assina.
 *
 *  Os mesmos serviços escolhidos para filmes valem aqui — no TMDB a Netflix
 *  tem o mesmo id nos dois catálogos —, então não há segunda escolha a
 *  fazer. Os gêneros, sim, são outra lista: não existe "Terror" em série,
 *  existe "Sci-Fi & Fantasy" que não existe em filme.
 *
 *  Sem botão de marcar por enquanto: a tabela `marks` guarda um id só, e as
 *  numerações de série e de filme no TMDB são independentes — a série 1399
 *  e o filme 1399 são títulos diferentes e ocupariam a mesma linha. */
export default async function SeriesPage({ searchParams }: SeriesPageProps) {
  const params = await searchParams

  const [selectedIds, allProviders, genres] = await Promise.all([
    readSelectedProviderIds(),
    getRegionProviders(),
    SERIES.genres(),
  ])

  const selectedProviders = allProviders.filter((p) =>
    selectedIds.includes(p.id),
  )

  return (
    <Catalogo
      api={SERIES}
      aba="series"
      params={params}
      selectedProviders={selectedProviders}
      selectedIds={selectedIds}
      genres={genres}
    />
  )
}
