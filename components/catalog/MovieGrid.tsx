import type { AvailabilityLabel } from '@/lib/catalog/search-availability'
import type { Movie } from '@/lib/catalog/types'
import type { MarkState } from '@/lib/marks/types'
import { EmptyState } from './EmptyState'
import { MarkButton } from './MarkButton'
import { MovieCard } from './MovieCard'

interface MovieGridProps {
  movies: Movie[]
  /** Selo por filme. Sem isto, os cartões saem sem régua de disponibilidade,
   *  como na home. */
  availability?: ReadonlyMap<number, AvailabilityLabel>
  /** Marcações da pessoa. A presença deste mapa é o que liga o botão de
   *  marcar — a home passa, a busca não. */
  marks?: ReadonlyMap<number, MarkState>
  signedIn?: boolean
}

export function MovieGrid({
  movies,
  availability,
  marks,
  signedIn = false,
}: MovieGridProps) {
  if (movies.length === 0) return <EmptyState />

  return (
    <div className="grid grid-cols-3 gap-x-3 gap-y-8 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8">
      {movies.map((movie) => (
        <MovieCard
          key={movie.id}
          movie={movie}
          availability={availability?.get(movie.id)}
          action={
            marks ? (
              <MarkButton
                movieId={movie.id}
                current={marks.get(movie.id) ?? null}
                signedIn={signedIn}
              />
            ) : undefined
          }
        />
      ))}
    </div>
  )
}
