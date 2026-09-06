import Image from 'next/image'
import Link from 'next/link'
import type { Movie } from '@/lib/catalog/types'

interface MovieCardProps {
  movie: Movie
  badge?: React.ReactNode
}

export function MovieCard({ movie, badge }: MovieCardProps) {
  return (
    <Link href={`/movie/${movie.id}`} className="group block">
      <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-neutral-900">
        {movie.posterUrl ? (
          <Image
            src={movie.posterUrl}
            alt={movie.title}
            fill
            sizes="(max-width: 768px) 33vw, 16vw"
            className="object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center px-2 text-center text-xs text-neutral-500">
            sem pôster
          </div>
        )}
      </div>
      <p className="mt-2 line-clamp-2 text-sm text-neutral-200">
        {movie.title}
      </p>
      {movie.year !== null && (
        <p className="text-xs text-neutral-500">{movie.year}</p>
      )}
      {badge}
    </Link>
  )
}
