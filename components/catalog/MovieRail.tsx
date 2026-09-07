import Image from 'next/image'
import type { Movie, Provider } from '@/lib/catalog/types'
import type { MarkState } from '@/lib/marks/types'
import { MarkButton } from './MarkButton'
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
  /** Marcações da pessoa. A presença deste mapa é o que liga o botão de
   *  marcar em cada cartão, como em MovieGrid. */
  marks?: ReadonlyMap<number, MarkState>
  signedIn?: boolean
  /** Raiz da rota de cada titulo, repassada aos cartoes. */
  base?: string
}

export function MovieRail({
  title,
  movies,
  provider,
  ranked = false,
  marks,
  signedIn = false,
  base = '/movie',
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
              base={base}
              rank={ranked ? index + 1 : undefined}
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
          </div>
        ))}
      </RailStrip>
    </section>
  )
}
