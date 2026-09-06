import type { Movie } from '@/lib/catalog/types'
import { MovieCard } from './MovieCard'

interface MovieRailProps {
  title: string
  movies: Movie[]
}

export function MovieRail({ title, movies }: MovieRailProps) {
  // Um carrossel vazio rotulado "Na Netflix" comunica erro mesmo sem erro.
  if (movies.length === 0) return null

  return (
    <section className="mb-8">
      <h2 className="mb-3 text-lg font-semibold text-neutral-100">{title}</h2>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {movies.map((movie) => (
          <div key={movie.id} className="w-32 shrink-0 sm:w-40">
            <MovieCard movie={movie} />
          </div>
        ))}
      </div>
    </section>
  )
}
