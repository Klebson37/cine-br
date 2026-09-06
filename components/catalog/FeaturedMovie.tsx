import Image from 'next/image'
import Link from 'next/link'
import {
  describeSelection,
  formatRating,
  formatRuntime,
} from '@/lib/catalog/format'
import type { Movie, Provider } from '@/lib/catalog/types'
import { MetaLine } from './MetaLine'

interface FeaturedMovieProps {
  movie: Movie | undefined
  /** Quantos serviços o usuário marcou. Muda a frase de contexto. */
  selectedCount?: number
  /** Serviço que inclui o filme. Só acende em dourado quando é um dos
   *  serviços que o usuário assina — dourado significa "você já paga". */
  included?: { provider: Provider; mine: boolean } | null
}

export function FeaturedMovie({
  movie,
  selectedCount,
  included,
}: FeaturedMovieProps) {
  // Sem filme não há destaque; sem imagem, um destaque vazio pareceria erro.
  if (!movie) return null
  const image = movie.backdropUrl ?? movie.posterUrl
  if (!image) return null

  return (
    <section className="arte-topo relative isolate flex h-[88vh] max-h-[54rem] min-h-[36rem] w-full flex-col justify-end overflow-hidden">
      <div className="assenta absolute inset-0 -z-30">
        <Image
          src={image}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-[50%_22%]"
        />
      </div>

      {/* Quatro véus, cada um com um trabalho: vinheta fecha as bordas, o
          rodapé funde a arte na tinta, a esquerda abre espaço para a leitura
          e o pé estende a fusão até as fileiras. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(115%_85%_at_72%_30%,transparent_0%,rgba(21,15,34,0.35)_58%,rgba(21,15,34,0.9)_100%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-20 bg-gradient-to-t from-tinta via-tinta/45 via-45% to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-20 bg-gradient-to-r from-tinta/85 via-tinta/15 via-38% to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-20 h-40 bg-gradient-to-t from-tinta to-transparent"
      />

      <div className="relative px-[var(--margem)] pb-16 sm:pb-20">
        <div className="entra max-w-[50rem]">
          {selectedCount !== undefined && (
            <p className="sobre-arte mb-4 text-sm text-projecao/75">
              {describeSelection(selectedCount)}
            </p>
          )}

          <h1 className="panoramico sobre-arte text-balance text-[clamp(2.375rem,6vw,4.75rem)] font-bold leading-[0.94] text-projecao">
            {movie.title}
          </h1>

          <MetaLine
            className="sobre-arte mt-6 text-sm text-projecao/70"
            items={[
              movie.year !== null ? String(movie.year) : null,
              formatRuntime(movie.runtimeMinutes),
              formatRating(movie.rating),
            ]}
          />

          {movie.overview && (
            <p className="sobre-arte mt-5 line-clamp-3 max-w-[48ch] text-[0.9375rem] leading-relaxed text-projecao/85">
              {movie.overview}
            </p>
          )}
        </div>

        <div className="entra-tarde mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
          <Link
            href={`/movie/${movie.id}`}
            className="rounded-sm bg-projecao px-7 py-3.5 text-sm font-semibold text-tinta shadow-[0_10px_40px_-12px_rgba(245,239,230,0.45)] transition-opacity hover:opacity-85"
          >
            Onde assistir
          </Link>

          {included && (
            <p
              className={`flex items-center gap-2 rounded-sm border-l-[3px] py-1.5 pl-3 pr-4 text-sm backdrop-blur-sm ${
                included.mine
                  ? 'border-luz bg-luz/[0.07] text-luz'
                  : 'border-projecao/25 bg-tinta/35 text-projecao/80'
              }`}
            >
              {included.provider.logoUrl && (
                <Image
                  src={included.provider.logoUrl}
                  alt=""
                  width={20}
                  height={20}
                  className="rounded-[3px]"
                />
              )}
              {included.mine ? 'Na sua assinatura ' : 'Na assinatura '}
              {included.provider.name}
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
