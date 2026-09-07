import Image from 'next/image'
import Link from 'next/link'
import type { AvailabilityLabel } from '@/lib/catalog/search-availability'
import type { Movie } from '@/lib/catalog/types'
import { AvailabilityBadge } from './AvailabilityBadge'

interface MovieCardProps {
  movie: Movie
  /** Quando informado, a disponibilidade governa o tratamento do pôster:
   *  o que você já paga fica aceso, o resto recua. */
  availability?: AvailabilityLabel
  /** Posição na classificação, quando a fileira é um ranking. */
  rank?: number
  /** Encaixe para o botão de marcar. Fica FORA do link de propósito: um
   *  form ou button dentro de um <a> é HTML inválido, quebra a navegação
   *  por teclado e faz o clique navegar para o filme junto. */
  action?: React.ReactNode
}

export function MovieCard({ movie, availability, rank, action }: MovieCardProps) {
  const recuado = availability === 'paid' || availability === 'unavailable'

  return (
    <div className="group relative">
      {/* Acima do pôster, não sobre ele: em cima da arte o rótulo competia
          com a imagem e escondia parte do cartaz. */}
      {action && <div className="mb-1.5 flex justify-end">{action}</div>}

      <Link href={`/movie/${movie.id}`} className="block">
        {rank !== undefined && (
          // A posição é decorativa para quem lê a tela: a ordem dos cartões
          // já é a própria classificação.
          <span
            aria-hidden
            className="numeral pointer-events-none absolute bottom-14 left-0 z-10 -translate-x-[70%] text-[4rem] leading-[0.72] sm:text-[5rem] xl:text-[6rem]"
          >
            {rank}
          </span>
        )}

        <div
          className={`relative aspect-[2/3] overflow-hidden rounded-[2px] bg-sala ring-1 ring-inset ring-borda/70 transition duration-300 group-hover:scale-[1.05] group-hover:shadow-[0_22px_50px_-16px_rgba(0,0,0,0.9)] group-hover:ring-projecao/45 ${
            recuado ? 'opacity-55 saturate-[0.35] group-hover:opacity-90' : ''
          }`}
        >
          {movie.posterUrl ? (
            <Image
              src={movie.posterUrl}
              alt=""
              fill
              sizes="(max-width: 640px) 33vw, (max-width: 1024px) 20vw, 14rem"
              className="object-cover"
            />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center px-3 text-center text-xs leading-snug text-nevoa">
              Sem pôster
            </span>
          )}
        </div>

        {availability && <AvailabilityBadge label={availability} />}

        <p className="mt-2 line-clamp-2 min-h-[2.25rem] text-[0.8125rem] font-medium leading-snug text-projecao/80 transition-colors group-hover:text-projecao">
          {movie.title}
        </p>
        {movie.year !== null && (
          <p className="mt-0.5 text-xs text-nevoa">{movie.year}</p>
        )}
      </Link>
    </div>
  )
}
