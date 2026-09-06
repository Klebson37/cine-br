import { MAX_PROVIDERS } from '@/lib/preferences'
import type { Provider } from './types'

export interface RailSpec {
  key: string
  title: string
  providerIds: number[]
}

/** Quantos filmes a fileira de classificação mostra. O título promete
 *  dez, então são dez. */
export const TAMANHO_RANKING = 10

/**
 * Uma fileira de populares somada a uma por serviço selecionado.
 * Desmarcar um serviço faz a fileira dele sumir — é a premissa do app
 * aparecendo na interface.
 */
export function buildRailSpecs(
  selected: Provider[],
  /** Com filtro de nota a fileira pode entregar quatro filmes, e um título
   *  que promete dez passaria a mentir — o mesmo cuidado que já impede o
   *  ranking de remover o destaque do topo. */
  hasRatingFilter = false,
): RailSpec[] {
  const providers = selected.slice(0, MAX_PROVIDERS)
  const quantos = hasRatingFilter ? 'Os' : 'Os 10'

  const popular: RailSpec = {
    key: 'popular',
    // Sem serviço marcado a fileira não é "sua": é o catálogo do país.
    title:
      providers.length === 0
        ? `${quantos} mais populares no Brasil`
        : `${quantos} mais populares nos seus streamings`,
    providerIds: providers.map((p) => p.id),
  }

  const perProvider = providers.map((provider) => ({
    key: `provider-${provider.id}`,
    title: `Na ${provider.name}`,
    providerIds: [provider.id],
  }))

  return [popular, ...perProvider]
}
