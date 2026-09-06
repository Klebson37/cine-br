import type { Movie } from '@/lib/catalog/types'
import { EmptyState } from './EmptyState'
import { MovieCard } from './MovieCard'

interface MovieGridProps {
  movies: Movie[]
}

export function MovieGrid({ movies }: MovieGridProps) {
  if (movies.length === 0) return <EmptyState />

  return (
    <div className="grid grid-cols-3 gap-x-3 gap-y-8 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8">
      {movies.map((movie) => (
        <MovieCard key={movie.id} movie={movie} />
      ))}
    </div>
  )
}
