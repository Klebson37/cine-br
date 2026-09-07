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
import {
  applyRatingToList,
  applyRatingToRails,
} from '@/lib/catalog/rated-discovery'
import {
  MIN_VOTE_COUNT,
  parseMinRating,
  prefilterVoteAverage,
  type MinRating,
} from '@/lib/catalog/rating-filter'
import type { Movie, Provider } from '@/lib/catalog/types'
import { readSelectedProviderIds } from '@/lib/preferences.server'

interface HomePageProps {
  searchParams: Promise<{
    genre?: string
    sort?: string
    rating?: string
    providers?: string
  }>
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams
  const mode = resolveHomeMode(params)
  // Convertida uma vez, aqui: daqui para baixo ninguém mais vê string.
  const minRating = parseMinRating(params.rating)

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
          minRating={minRating}
        />
      ) : (
        <FilteredMode
          providerIds={selectedIds}
          genres={genres}
          genre={params.genre}
          sort={params.sort}
          minRating={minRating}
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
  minRating,
}: {
  selectedProviders: Provider[]
  selectedCount: number
  genres: Awaited<ReturnType<typeof getGenres>>
  minRating: MinRating | null
}) {
  const specs = buildRailSpecs(selectedProviders, minRating !== null)
  const byId = new Map(selectedProviders.map((p) => [p.id, p]))

  // Buscadas em paralelo. Uma fileira que falha vira lista vazia e some,
  // em vez de derrubar a home inteira.
  const results = await Promise.all(
    specs.map((spec) =>
      discoverMovies({
        providerIds: spec.providerIds,
        minVoteAverage:
          minRating === null ? undefined : prefilterVoteAverage(minRating),
        minVoteCount: minRating === null ? undefined : MIN_VOTE_COUNT,
      }).catch(() => [] as Movie[]),
    ),
  )

  // Uma rodada de consultas ao IMDb para o conjunto todo, deduplicado.
  const filtrados =
    minRating === null ? results : await applyRatingToRails(results, minRating)

  const featured = filtrados[0]?.[0]
  const included = await resolveIncluded(
    featured,
    selectedProviders.map((p) => p.id),
  )

  const rails = specs.map((spec, index) => ({
    spec,
    // A primeira fileira é uma classificação: mostra os dez primeiros na
    // ordem exata, sem tirar o destaque do topo — tirar deslocaria todas as
    // posições e a numeração passaria a mentir. O corte vem DEPOIS do filtro
    // de nota: cortar antes entregaria três filmes sob um título de dez.
    movies:
      index === 0 ? filtrados[0].slice(0, TAMANHO_RANKING) : filtrados[index],
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
        <FilterBar genres={genres} activeRating={minRating} />
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
  minRating,
}: {
  providerIds: number[]
  genres: Awaited<ReturnType<typeof getGenres>>
  genre?: string
  sort?: string
  minRating: MinRating | null
}) {
  const encontrados = await discoverMovies({
    providerIds,
    genreId: genre ? Number.parseInt(genre, 10) : undefined,
    sortBy: sort || undefined,
    minVoteAverage:
      minRating === null ? undefined : prefilterVoteAverage(minRating),
    minVoteCount: minRating === null ? undefined : MIN_VOTE_COUNT,
  })

  const movies =
    minRating === null
      ? encontrados
      : await applyRatingToList(encontrados, minRating)

  return (
    <div className="wrap pt-10">
      <FilterBar
        genres={genres}
        activeGenre={genre}
        activeSort={sort}
        activeRating={minRating}
      />
      <div className="mt-10">
        <MovieGrid movies={movies} />
      </div>
    </div>
  )
}
