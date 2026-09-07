import { cookies } from 'next/headers'
import { sairDoMais18 } from '@/app/actions'
import { MovieRail } from '@/components/catalog/MovieRail'
import { PortaoMaioridade } from '@/components/catalog/PortaoMaioridade'
import {
  FAIXAS_ADULTAS,
  MAIOR_IDADE_COOKIE,
  confirmouMaioridade,
} from '@/lib/catalog/adulto'
import { discoverMovies } from '@/lib/catalog/queries'
import { TAMANHO_RANKING } from '@/lib/catalog/rails'
import type { Movie } from '@/lib/catalog/types'
import { readSelectedProviderIds } from '@/lib/preferences.server'

/** A seção +18: cinema de teor adulto.
 *
 *  A primeira versão desta página era montada por classificação etária, e
 *  trazia Deadpool e Demon Slayer — selo 18 por violência, não por teor.
 *  Agora o corte é por palavra-chave, que é o que descreve teor de fato.
 *  O porquê de cada escolha está em lib/catalog/adulto.ts. */
export default async function Mais18Page() {
  const store = await cookies()
  if (!confirmouMaioridade(store.get(MAIOR_IDADE_COOKIE)?.value)) {
    return <PortaoMaioridade />
  }

  const selectedIds = await readSelectedProviderIds()

  // Em paralelo. A fileira que falhar vira lista vazia e some, em vez de
  // derrubar a seção inteira.
  const resultados = await Promise.all(
    FAIXAS_ADULTAS.map((faixa) =>
      discoverMovies({
        providerIds: selectedIds,
        keywords: faixa.keywords,
        sortBy: faixa.sortBy,
        minVoteCount: faixa.minVoteCount,
      }).catch(() => [] as Movie[]),
    ),
  )

  const temAlgo = resultados.some((lista) => lista.length > 0)

  return (
    <div className="pt-10">
      <div className="wrap">
        <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
          <div>
            <h1 className="panoramico text-[clamp(1.75rem,4vw,2.75rem)] font-bold leading-tight text-projecao">
              Seção +18
            </h1>
            <p className="mt-3 max-w-[62ch] text-sm leading-relaxed text-nevoa">
              Cinema erótico e de teor adulto, de vários lugares do mundo.{' '}
              {selectedIds.length > 0
                ? 'Filtrado pelos streamings que você assina.'
                : 'Escolha seus streamings para ver só o que já está incluído.'}
            </p>
          </div>

          <form action={sairDoMais18}>
            <button
              type="submit"
              className="inline-flex h-9 shrink-0 items-center rounded-full border border-borda px-4 text-sm text-nevoa transition-colors hover:border-cortina/60 hover:text-projecao"
            >
              Sair do +18
            </button>
          </form>
        </div>
      </div>

      {temAlgo ? (
        <div className="palco mt-4">
          {FAIXAS_ADULTAS.map((faixa, index) => (
            <MovieRail
              key={faixa.key}
              title={faixa.titulo}
              // A primeira fileira é uma classificação de dez, como na home.
              movies={
                index === 0
                  ? resultados[0].slice(0, TAMANHO_RANKING)
                  : resultados[index]
              }
              ranked={index === 0}
            />
          ))}
        </div>
      ) : (
        <div className="wrap mt-10">
          <p className="max-w-[52ch] text-sm leading-relaxed text-nevoa">
            Nada nos streamings que você selecionou. Tire algum filtro de
            streaming para ver o catálogo inteiro.
          </p>
        </div>
      )}

      {/* Dito no rodapé da seção, não escondido: quem chega esperando
          pornografia precisa saber em trinta segundos que não é isso. */}
      <div className="wrap mt-12">
        <p className="max-w-[62ch] border-t border-borda pt-6 text-xs leading-relaxed text-nevoa/80">
          Esta seção lista cinema erótico comercial e classificado. Não é
          conteúdo pornográfico: a base de dados do TMDB, que abastece o site
          inteiro, não disponibiliza esse catálogo para navegação.
        </p>
      </div>
    </div>
  )
}
