import Image from 'next/image'
import type { Movie, Provider } from '@/lib/catalog/types'
import { MovieCard } from './MovieCard'
import { RailStrip } from './RailStrip'

interface MovieRailProps {
  title: string
  movies: Movie[]
  /** O serviço dono da fileira. A marca fica no título, uma vez, em vez de
   *  repetida em cada pôster. */
  provider?: Provider
  /** Fileira de ranking: os cartões recebem a posição. Só vale quando a
   *  ordem é mesmo uma classificação, não uma lista qualquer. */
  ranked?: boolean
}

export function MovieRail({
  title,
  movies,
  provider,
  ranked = false,
}: MovieRailProps) {
  // Um carrossel vazio rotulado "Na Netflix" comunica erro mesmo sem erro.
  if (movies.length === 0) return null

  return (
    <section className="mt-9">
      <h2 className="titulo-secao flex items-center gap-2.5 px-[var(--margem)] text-[1.0625rem] text-projecao">
        {provider?.logoUrl && (
          <Image
            src={provider.logoUrl}
            alt=""
            width={26}
            height={26}
            className="rounded-[4px]"
          />
        )}
        {title}
      </h2>

      <RailStrip>
        {movies.map((movie, index) => (
          <div
            key={movie.id}
            className={`shrink-0 ${
              ranked
                ? 'w-[10.5rem] pl-[3rem] sm:w-[13rem] sm:pl-[4rem] xl:w-[15.5rem] xl:pl-[5rem]'
                : 'w-[7.5rem] sm:w-[9rem] xl:w-[10.5rem]'
            }`}
          >
            <MovieCard
              movie={movie}
              rank={ranked ? index + 1 : undefined}
            />
          </div>
        ))}
      </RailStrip>
    </section>
  )
}
