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
export function buildRailSpecs(selected: Provider[]): RailSpec[] {
  const providers = selected.slice(0, MAX_PROVIDERS)

  const popular: RailSpec = {
    key: 'popular',
    // Sem serviço marcado a fileira não é "sua": é o catálogo do país.
    title:
      providers.length === 0
        ? 'Os 10 mais populares no Brasil'
        : 'Os 10 mais populares nos seus streamings',
    providerIds: providers.map((p) => p.id),
  }

  const perProvider = providers.map((provider) => ({
    key: `provider-${provider.id}`,
    title: `Na ${provider.name}`,
    providerIds: [provider.id],
  }))

  return [popular, ...perProvider]
}
