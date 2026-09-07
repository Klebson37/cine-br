import Image from 'next/image'
import { MetaLine } from '@/components/catalog/MetaLine'
import { Nota } from '@/components/catalog/Nota'
import { VoltarAoCatalogo } from '@/components/layout/VoltarAoCatalogo'
import { CastList } from '@/components/movie/CastList'
import { Trailer } from '@/components/movie/Trailer'
import { WhereToWatch } from '@/components/movie/WhereToWatch'
import { formatRuntime } from '@/lib/catalog/format'
import type { MovieDetail } from '@/lib/catalog/types'

interface DetalheMidiaProps {
  movie: MovieDetail
  selectedIds: number[]
  /** Botão de marcar, quando a seção tem listas. Chega montado de fora
   *  porque depende de sessão, e este componente não busca nada. */
  acao?: React.ReactNode
  /** Para onde a seta de voltar leva, e como ela se chama. */
  voltar: { href: string; rotulo: string }
  /** Como chamar a duração, já que em série ela é a do episódio. */
  rotuloDuracao?: string
}

/** A página de um título — filme ou série.
 *
 *  As duas seções mostram exatamente as mesmas coisas na mesma ordem, e o
 *  que muda são os dados e os endereços. Manter dois arquivos quase iguais
 *  garantiria que uma correção fosse aplicada só em um deles. */
export function DetalheMidia({
  movie,
  selectedIds,
  acao,
  voltar,
  rotuloDuracao,
}: DetalheMidiaProps) {
  // Montado uma vez: o painel é o mesmo nos dois arranjos, com trailer e sem.
  const ondeAssistir = (
    <WhereToWatch
      availability={movie.availability}
      selectedIds={selectedIds}
      title={movie.title}
    />
  )

  const duracao = formatRuntime(movie.runtimeMinutes)

  return (
    <article>
      {movie.backdropUrl && (
        <div className="arte-topo relative h-[calc(38vh+var(--cabecalho))] max-h-[30rem] min-h-[18rem] w-full overflow-hidden">
          <Image
            src={movie.backdropUrl}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-[50%_25%]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(110%_80%_at_70%_25%,transparent_0%,rgba(21,15,34,0.5)_60%,rgba(21,15,34,0.95)_100%)]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-tinta via-tinta/60 to-transparent"
          />
        </div>
      )}

      {/* Com panorama a margem negativa cresce para abrir espaço ao link sem
          mover o pôster do lugar onde ele já entrava na arte. */}
      <div className={`wrap relative ${movie.backdropUrl ? '-mt-36' : 'pt-8'}`}>
        <VoltarAoCatalogo
          href={voltar.href}
          rotulo={voltar.rotulo}
          className="mb-4"
        />

        <div className="flex flex-col gap-8 sm:flex-row sm:items-end">
          {/* O pôster sobe para dentro do panorama: a página começa no título. */}
          <div className="relative aspect-[2/3] w-36 shrink-0 overflow-hidden rounded-[2px] bg-sala ring-1 ring-inset ring-borda sm:w-52">
            {movie.posterUrl && (
              <Image
                src={movie.posterUrl}
                alt=""
                fill
                sizes="(max-width: 640px) 9rem, 13rem"
                className="object-cover"
              />
            )}
          </div>

          <div className="min-w-0 pb-1">
            <h1 className="panoramico text-[clamp(1.875rem,4.5vw,3.5rem)] font-bold leading-[1] text-projecao">
              {movie.title}
            </h1>
            {/* A nota sai da linha de texto e vira selo: é o dado que decide
                se a pessoa assiste, e como texto cinza entre o ano e a
                duração ela pesava o mesmo que a duração. */}
            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-3">
              <Nota rating={movie.rating} variant="destaque" />
              <MetaLine
                className="text-sm text-nevoa"
                items={[
                  movie.year !== null ? String(movie.year) : null,
                  duracao === null
                    ? null
                    : rotuloDuracao
                      ? `${duracao} ${rotuloDuracao}`
                      : duracao,
                ]}
              />
            </div>
            {acao && <div className="mt-5">{acao}</div>}
          </div>
        </div>

        {/* Pilha com gap, não margens por bloco: uma seção que não existe
            — sem sinopse, sem trailer, sem elenco — não gera nó nenhum, e
            portanto não deixa buraco. Margem em div externa deixaria. */}
        <div className="mt-10 flex flex-col gap-12">
          {movie.overview && (
            <p className="max-w-[64ch] leading-relaxed text-projecao/85">
              {movie.overview}
            </p>
          )}

          {movie.trailerYoutubeKey ? (
            /* Onde assistir vem primeiro no HTML porque é a razão do app; no
               desktop ele vai para a coluna da direita e fica visível junto
               com o trailer. */
            <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_23rem]">
              <div className="lg:sticky lg:top-24 lg:col-start-2 lg:row-start-1">
                {ondeAssistir}
              </div>

              <div className="lg:col-start-1 lg:row-start-1">
                <Trailer youtubeKey={movie.trailerYoutubeKey} />
              </div>
            </div>
          ) : (
            /* Sem trailer não existe coluna da esquerda para preencher. O
               painel volta para a margem, na largura em que se lê, em vez de
               ficar encolhido à direita de um vão da largura da página. */
            <div className="max-w-[34rem]">{ondeAssistir}</div>
          )}

          <CastList cast={movie.cast} />
        </div>
      </div>
    </article>
  )
}
