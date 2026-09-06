import Image from 'next/image'
import Link from 'next/link'
import type { Movie } from '@/lib/catalog/types'

interface FeaturedMovieProps {
  movie: Movie | undefined
}

export function FeaturedMovie({ movie }: FeaturedMovieProps) {
  // Sem filme não há destaque; sem imagem, um destaque vazio pareceria erro.
  if (!movie) return null
  const image = movie.backdropUrl ?? movie.posterUrl
  if (!image) return null

  return (
    <section className="relative mb-6 h-[42vh] min-h-64 overflow-hidden rounded-xl">
      <Image
        src={image}
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/60 to-transparent" />
      <div className="absolute bottom-0 left-0 max-w-2xl p-6">
        <h1 className="text-3xl font-bold text-white">{movie.title}</h1>
        <p className="mt-1 text-sm text-neutral-300">
          {movie.year !== null && <span>{movie.year}</span>}
          {movie.rating !== null && (
            <span className="ml-3">★ {movie.rating.toFixed(1)}</span>
          )}
        </p>
        <p className="mt-2 line-clamp-3 text-sm text-neutral-200">
          {movie.overview}
        </p>
        <Link
          href={`/movie/${movie.id}`}
          className="mt-4 inline-block rounded-full bg-emerald-500 px-6 py-2 text-sm font-medium text-neutral-950"
        >
          Ver detalhes
        </Link>
      </div>
    </section>
  )
}
