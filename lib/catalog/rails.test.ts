import { describe, expect, it } from 'vitest'
import { buildRailSpecs } from './rails'
import type { Provider } from './types'

function provider(id: number, name: string): Provider {
  return { id, name, logoUrl: null }
}

describe('buildRailSpecs', () => {
  it('devolve só a fileira de populares quando nada foi selecionado', () => {
    const rails = buildRailSpecs([])
    expect(rails).toHaveLength(1)
    expect(rails[0].key).toBe('popular')
    expect(rails[0].providerIds).toEqual([])
    expect(rails[0].title).toBe('Os 10 mais populares no Brasil')
  })

  it('põe a fileira de populares em primeiro lugar', () => {
    const rails = buildRailSpecs([provider(8, 'Netflix')])
    expect(rails[0].key).toBe('popular')
    expect(rails[0].title).toBe('Os 10 mais populares nos seus streamings')
    expect(rails[0].providerIds).toEqual([8])
  })

  it('cria uma fileira por serviço, com o nome no título', () => {
    const rails = buildRailSpecs([
      provider(8, 'Netflix'),
      provider(119, 'Amazon Prime Video'),
    ])
    expect(rails).toHaveLength(3)
    expect(rails[1]).toEqual({
      key: 'provider-8',
      title: 'Na Netflix',
      providerIds: [8],
    })
    expect(rails[2].title).toBe('Na Amazon Prime Video')
  })

  it('respeita o teto de quatro serviços, gerando no máximo cinco fileiras', () => {
    const rails = buildRailSpecs([
      provider(1, 'A'),
      provider(2, 'B'),
      provider(3, 'C'),
      provider(4, 'D'),
      provider(5, 'E'),
    ])
    expect(rails).toHaveLength(5)
  })

  it('gera chaves únicas', () => {
    const rails = buildRailSpecs([provider(8, 'Netflix'), provider(9, 'Max')])
    const keys = rails.map((r) => r.key)
    expect(new Set(keys).size).toBe(keys.length)
  })
})
