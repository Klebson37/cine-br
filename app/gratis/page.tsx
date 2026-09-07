import { MovieRail } from '@/components/catalog/MovieRail'
import {
  IDS_GRATIS,
  MONETIZACAO_SEM_CUSTO,
  SERVICOS_GRATIS_LISTA,
} from '@/lib/catalog/gratis'
import { discoverMovies } from '@/lib/catalog/queries'
import { TAMANHO_RANKING } from '@/lib/catalog/rails'
import type { Movie } from '@/lib/catalog/types'

/** Tudo o que dá para assistir sem pagar nada.
 *
 *  Doze serviços, somando cerca de 37 mil filmes — medidos um a um, não
 *  estimados. Todos legais e mantidos por quem exibe anúncio no lugar de
 *  cobrar assinatura.
 *
 *  A consulta pede `free|ads` e nada mais. Deixar `flatrate` entrar seria a
 *  promessa quebrada que o nome da seção proíbe: alguém abriria "Grátis" e
 *  encontraria um filme que precisa de Netflix. */
export default async function GratisPage() {
  const fileiras = [
    { key: 'populares', titulo: 'Os 10 mais populares de graça', ids: IDS_GRATIS },
    ...SERVICOS_GRATIS_LISTA.map((servico) => ({
      key: `servico-${servico.id}`,
      titulo: `No ${servico.nome}`,
      ids: String(servico.id),
    })),
  ]

  // Em paralelo. A que falhar vira lista vazia e some, em vez de derrubar a
  // página inteira.
  const resultados = await Promise.all(
    fileiras.map((fileira) =>
      discoverMovies({
        providerIds: fileira.ids.split('|').map(Number),
        monetization: MONETIZACAO_SEM_CUSTO,
      }).catch(() => [] as Movie[]),
    ),
  )

  const total = SERVICOS_GRATIS_LISTA.reduce((s, x) => s + x.acervo, 0)
  const temAlgo = resultados.some((lista) => lista.length > 0)

  return (
    <div className="pt-10">
      <div className="wrap">
        <h1 className="panoramico text-[clamp(1.75rem,4vw,2.75rem)] font-bold leading-tight text-projecao">
          De graça, sem assinatura
        </h1>
        <p className="mt-3 max-w-[64ch] text-sm leading-relaxed text-nevoa">
          {SERVICOS_GRATIS_LISTA.length} serviços legais que não cobram nada —
          cerca de {total.toLocaleString('pt-BR')} filmes ao todo. Alguns
          passam anúncio no meio, como a TV aberta; nenhum pede cartão.
        </p>
      </div>

      {temAlgo ? (
        <div className="palco mt-4">
          {fileiras.map((fileira, index) => (
            <MovieRail
              key={fileira.key}
              title={fileira.titulo}
              // A primeira é uma classificação de dez, como na home.
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
            Nenhum dos serviços gratuitos respondeu agora. Costuma ser
            passageiro — tente de novo em alguns minutos.
          </p>
        </div>
      )}

      <div className="wrap mt-12">
        <p className="max-w-[64ch] border-t border-borda pt-6 text-xs leading-relaxed text-nevoa/80">
          Estes serviços se sustentam com publicidade e licenciam o que
          exibem. O CineBR não hospeda vídeo: cada filme abre no site ou no
          aplicativo de quem tem o direito de mostrá-lo.
        </p>
      </div>
    </div>
  )
}
