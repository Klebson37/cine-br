import Image from 'next/image'
import { notFound } from 'next/navigation'
import { CastList } from '@/components/movie/CastList'
import { Trailer } from '@/components/movie/Trailer'
import { WhereToWatch } from '@/components/movie/WhereToWatch'
import { getMovieDetail } from '@/lib/catalog/queries'

interface MoviePageProps {
  params: Promise<{ id: string }>
}

export default async function MoviePage({ params }: MoviePageProps) {
  const { id } = await params
  const movieId = Number.parseInt(id, 10)
  if (!Number.isInteger(movieId) || movieId <= 0) notFound()

  const movie = await getMovieDetail(movieId)
  if (!movie) notFound()

  return (
    <article>
      <div className="flex flex-col gap-6 sm:flex-row">
        <div className="relative aspect-[2/3] w-full max-w-56 shrink-0 overflow-hidden rounded-lg bg-neutral-900">
          {movie.posterUrl && (
            <Image
              src={movie.posterUrl}
              alt={movie.title}
              fill
              sizes="224px"
              className="object-cover"
            />
          )}
        </div>

        <div className="flex-1">
          <h1 className="text-3xl font-bold">{movie.title}</h1>
          <p className="mt-1 text-sm text-neutral-400">
            {movie.year !== null && <span>{movie.year}</span>}
            {movie.rating !== null && (
              <span className="ml-3">★ {movie.rating.toFixed(1)}</span>
            )}
            {movie.runtimeMinutes !== null && (
              <span className="ml-3">{movie.runtimeMinutes} min</span>
            )}
          </p>
          <p className="mt-4 text-neutral-200">{movie.overview}</p>
        </div>
      </div>

      <div className="mt-8">
        <WhereToWatch availability={movie.availability} />
      </div>

      <Trailer youtubeKey={movie.trailerYoutubeKey} />
      <CastList cast={movie.cast} />
    </article>
  )
}
