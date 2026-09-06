import { FeaturedMovie } from '@/components/catalog/FeaturedMovie'
import { MovieGrid } from '@/components/catalog/MovieGrid'
import { MovieRail } from '@/components/catalog/MovieRail'
import { FilterBar } from '@/components/filters/FilterBar'
import { ProviderPanel } from '@/components/filters/ProviderPanel'
import { resolveHomeMode } from '@/lib/catalog/home-mode'
import { TAMANHO_RANKING, buildRailSpecs } from '@/lib/catalog/rails'
import {
  discoverMovies,
  getAvailability,
  getGenres,
  getRegionProviders,
} from '@/lib/catalog/queries'
import type { Movie, Provider } from '@/lib/catalog/types'
import { readSelectedProviderIds } from '@/lib/preferences.server'

interface HomePageProps {
  searchParams: Promise<{
    genre?: string
    sort?: string
    providers?: string
  }>
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams
  const mode = resolveHomeMode(params)

  const [selectedIds, allProviders, genres] = await Promise.all([
    readSelectedProviderIds(),
    getRegionProviders(),
    getGenres(),
  ])

  const selectedProviders = allProviders.filter((p) =>
    selectedIds.includes(p.id),
  )

  return (
    <>
      {params.providers === 'open' && (
        <div className="wrap pt-8">
          {/* getRegionProviders já devolve ordenado por prioridade no BR.
              São 86 no total; os 20 primeiros cobrem todos os relevantes. */}
          <ProviderPanel
            providers={allProviders.slice(0, 20)}
            selectedIds={selectedIds}
          />
        </div>
      )}

      {mode === 'discovery' ? (
        <DiscoveryMode
          selectedProviders={selectedProviders}
          selectedCount={selectedIds.length}
          genres={genres}
        />
      ) : (
        <FilteredMode
          providerIds={selectedIds}
          genres={genres}
          genre={params.genre}
          sort={params.sort}
        />
      )}
    </>
  )
}

/** Qual serviço já inclui o destaque. Prefere um que o usuário assina; sem
 *  seleção, mostra o primeiro que tem o filme na assinatura. */
async function resolveIncluded(
  movie: Movie | undefined,
  selectedIds: number[],
): Promise<{ provider: Provider; mine: boolean } | null> {
  if (!movie) return null

  const availability = await getAvailability(movie.id).catch(() => null)
  if (!availability) return null

  const mine = availability.flatrate.find((p) => selectedIds.includes(p.id))
  if (mine) return { provider: mine, mine: true }

  const outro = availability.flatrate[0]
  return outro ? { provider: outro, mine: false } : null
}

async function DiscoveryMode({
  selectedProviders,
  selectedCount,
  genres,
}: {
  selectedProviders: Provider[]
  selectedCount: number
  genres: Awaited<ReturnType<typeof getGenres>>
}) {
  const specs = buildRailSpecs(selectedProviders)
  const byId = new Map(selectedProviders.map((p) => [p.id, p]))

  // Buscadas em paralelo. Uma fileira que falha vira lista vazia e some,
  // em vez de derrubar a home inteira.
  const results = await Promise.all(
    specs.map((spec) =>
      discoverMovies({ providerIds: spec.providerIds }).catch(
        () => [] as Movie[],
      ),
    ),
  )

  const featured = results[0]?.[0]
  const included = await resolveIncluded(
    featured,
    selectedProviders.map((p) => p.id),
  )

  const rails = specs.map((spec, index) => ({
    spec,
    // A primeira fileira é uma classificação: mostra os dez primeiros na
    // ordem exata, sem tirar o destaque do topo — tirar deslocaria todas as
    // posições e a numeração passaria a mentir.
    movies:
      index === 0 ? results[0].slice(0, TAMANHO_RANKING) : results[index],
    ranked: index === 0,
    // Só as fileiras de um serviço só carregam a marca no título.
    provider:
      spec.providerIds.length === 1 ? byId.get(spec.providerIds[0]) : undefined,
  }))

  return (
    <>
      <FeaturedMovie
        movie={featured}
        selectedCount={selectedCount}
        included={included}
      />

      <div className="wrap mt-6">
        <FilterBar genres={genres} />
      </div>

      <div className="palco">
        {rails.map(({ spec, movies, provider, ranked }) => (
          <MovieRail
            key={spec.key}
            title={spec.title}
            movies={movies}
            provider={provider}
            ranked={ranked}
          />
        ))}
      </div>
    </>
  )
}

async function FilteredMode({
  providerIds,
  genres,
  genre,
  sort,
}: {
  providerIds: number[]
  genres: Awaited<ReturnType<typeof getGenres>>
  genre?: string
  sort?: string
}) {
  const movies = await discoverMovies({
    providerIds,
    genreId: genre ? Number.parseInt(genre, 10) : undefined,
    sortBy: sort || undefined,
  })

  return (
    <div className="wrap pt-10">
      <FilterBar genres={genres} activeGenre={genre} activeSort={sort} />
      <div className="mt-10">
        <MovieGrid movies={movies} />
      </div>
    </div>
  )
}
