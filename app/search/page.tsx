import Link from 'next/link'
import { AvailabilityBadge } from '@/components/catalog/AvailabilityBadge'
import { EmptyState } from '@/components/catalog/EmptyState'
import { MovieCard } from '@/components/catalog/MovieCard'
import { getAvailability, searchMovies } from '@/lib/catalog/queries'
import { classifyAvailability } from '@/lib/catalog/search-availability'
import { readSelectedProviderIds } from '@/lib/preferences'

interface SearchPageProps {
  searchParams: Promise<{ q?: string; only?: string }>
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q, only } = await searchParams
  const query = q?.trim() ?? ''

  if (query === '') {
    return (
      <EmptyState
        title="Digite algo para buscar."
        hint="Use o campo no topo da página."
      />
    )
  }

  const [movies, selectedIds] = await Promise.all([
    searchMovies(query),
    readSelectedProviderIds(),
  ])

  // /search/movie não filtra por provedor, então a disponibilidade é
  // resolvida aqui, uma requisição por filme, em paralelo e com cache.
  const labeled = await Promise.all(
    movies.map(async (movie) => ({
      movie,
      label: classifyAvailability(
        await getAvailability(movie.id).catch(() => ({
          flatrate: [],
          rent: [],
          buy: [],
        })),
        selectedIds,
      ),
    })),
  )

  const onlyMine = only === '1'
  const visible = onlyMine
    ? labeled.filter((item) => item.label === 'subscription')
    : labeled

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">Resultados para “{query}”</h1>
        <Link
          href={`/search?q=${encodeURIComponent(query)}${onlyMine ? '' : '&only=1'}`}
          className="rounded-full bg-neutral-900 px-4 py-2 text-sm"
        >
          {onlyMine ? 'Mostrar todos' : 'Somente nos meus streamings'}
        </Link>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title="Nenhum filme encontrado."
          hint={
            onlyMine
              ? 'Nenhum resultado está nos seus streamings. Desligue o filtro para ver todos.'
              : 'Tente outro título.'
          }
        />
      ) : (
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6">
          {visible.map(({ movie, label }) => (
            <MovieCard
              key={movie.id}
              movie={movie}
              badge={<AvailabilityBadge label={label} />}
            />
          ))}
        </div>
      )}
    </>
  )
}
