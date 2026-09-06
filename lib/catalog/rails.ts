import { MAX_PROVIDERS } from '@/lib/preferences'
import type { Provider } from './types'

export interface RailSpec {
  key: string
  title: string
  providerIds: number[]
}

/**
 * Uma fileira de populares somada a uma por serviço selecionado.
 * Desmarcar um serviço faz a fileira dele sumir — é a premissa do app
 * aparecendo na interface.
 */
export function buildRailSpecs(selected: Provider[]): RailSpec[] {
  const providers = selected.slice(0, MAX_PROVIDERS)

  const popular: RailSpec = {
    key: 'popular',
    title: 'Populares nos seus streamings',
    providerIds: providers.map((p) => p.id),
  }

  const perProvider = providers.map((provider) => ({
    key: `provider-${provider.id}`,
    title: `Na ${provider.name}`,
    providerIds: [provider.id],
  }))

  return [popular, ...perProvider]
}
