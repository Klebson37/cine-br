import { FeaturedMovie } from '@/components/catalog/FeaturedMovie'
import { MovieGrid } from '@/components/catalog/MovieGrid'
import { MovieRail } from '@/components/catalog/MovieRail'
import { FilterBar } from '@/components/filters/FilterBar'
import { ProviderPanel } from '@/components/filters/ProviderPanel'
import { resolveHomeMode } from '@/lib/catalog/home-mode'
import { buildRailSpecs } from '@/lib/catalog/rails'
import {
  discoverMovies,
  getGenres,
  getRegionProviders,
} from '@/lib/catalog/queries'
import type { Movie } from '@/lib/catalog/types'
import { readSelectedProviderIds } from '@/lib/preferences'

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
        <div className="mb-6">
          {/* getRegionProviders já devolve ordenado por prioridade no BR.
              São 86 no total; os 20 primeiros cobrem todos os relevantes. */}
          <ProviderPanel
            providers={allProviders.slice(0, 20)}
            selectedIds={selectedIds}
          />
        </div>
      )}

      {mode === 'discovery' ? (
        <DiscoveryMode selectedProviders={selectedProviders} genres={genres} />
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

async function DiscoveryMode({
  selectedProviders,
  genres,
}: {
  selectedProviders: Awaited<ReturnType<typeof getRegionProviders>>
  genres: Awaited<ReturnType<typeof getGenres>>
}) {
  const specs = buildRailSpecs(selectedProviders)

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
  const rails = specs.map((spec, index) => ({
    spec,
    movies: index === 0 ? results[0].slice(1) : results[index],
  }))

  return (
    <>
      <FeaturedMovie movie={featured} />
      <FilterBar genres={genres} />
      {rails.map(({ spec, movies }) => (
        <MovieRail key={spec.key} title={spec.title} movies={movies} />
      ))}
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
    <>
      <FilterBar genres={genres} activeGenre={genre} activeSort={sort} />
      <MovieGrid movies={movies} />
    </>
  )
}
