import { describe, expect, it } from 'vitest'
import { melhorOpcaoParaAssistir, rotuloDeAssistir } from './assistir'
import type { Availability, Provider } from './types'

const netflix: Provider = { id: 8, name: 'Netflix', logoUrl: null }
const max: Provider = { id: 1899, name: 'HBO Max', logoUrl: null }
const appleStore: Provider = { id: 2, name: 'Apple TV Store', logoUrl: null }
const desconhecido: Provider = { id: 999999, name: 'Serviço X', logoUrl: null }

function disp(over: Partial<Availability> = {}): Availability {
  return { flatrate: [], rent: [], buy: [], link: null, ...over }
}

describe('melhorOpcaoParaAssistir', () => {
  it('prefere o serviço que a pessoa já paga', () => {
    const opcao = melhorOpcaoParaAssistir(
      disp({ flatrate: [max, netflix] }),
      'Matrix',
      [8],
    )
    expect(opcao?.provider.name).toBe('Netflix')
    expect(opcao?.modo).toBe('minha')
  })

  it('sem serviço marcado, cai na assinatura que existe', () => {
    const opcao = melhorOpcaoParaAssistir(disp({ flatrate: [max] }), 'Matrix')
    expect(opcao?.provider.name).toBe('HBO Max')
    expect(opcao?.modo).toBe('assinatura')
  })

  it('assinatura vence aluguel, mesmo sem ser a da pessoa', () => {
    const opcao = melhorOpcaoParaAssistir(
      disp({ flatrate: [max], rent: [appleStore] }),
      'Matrix',
      [],
    )
    expect(opcao?.modo).toBe('assinatura')
  })

  it('nao oferece compra a quem tem o filme incluido no que assina', () => {
    const opcao = melhorOpcaoParaAssistir(
      disp({ flatrate: [netflix], buy: [appleStore] }),
      'Matrix',
      [8],
    )
    expect(opcao?.modo).toBe('minha')
  })

  it('so aluguel: o botao existe, e diz que e aluguel', () => {
    const opcao = melhorOpcaoParaAssistir(
      disp({ rent: [appleStore] }),
      'Matrix',
    )
    expect(opcao?.modo).toBe('aluguel')
  })

  it('pula o servico sem endereco conhecido e pega o proximo', () => {
    const opcao = melhorOpcaoParaAssistir(
      disp({ flatrate: [desconhecido, netflix] }),
      'Matrix',
      [],
    )
    expect(opcao?.provider.name).toBe('Netflix')
  })

  it('com a reserva do TMDB, ate o desconhecido serve', () => {
    const opcao = melhorOpcaoParaAssistir(
      disp({ flatrate: [desconhecido], link: 'https://tmdb/x' }),
      'Matrix',
    )
    expect(opcao?.href).toBe('https://tmdb/x')
  })

  it('sem lugar nenhum, nao inventa botao', () => {
    expect(melhorOpcaoParaAssistir(disp(), 'Matrix')).toBeNull()
  })

  it('o endereco leva ao servico com o titulo', () => {
    const opcao = melhorOpcaoParaAssistir(disp({ flatrate: [netflix] }), 'Matrix')
    expect(opcao?.href).toContain('netflix.com/search')
    expect(opcao?.href).toContain('Matrix')
  })
})

describe('rotuloDeAssistir', () => {
  it('diz o verbo certo, para ninguem cair numa tela de compra sem saber', () => {
    const casos = [
      ['minha', 'Assistir na Netflix'],
      ['assinatura', 'Assistir na Netflix'],
      ['aluguel', 'Alugar na Netflix'],
      ['compra', 'Comprar na Netflix'],
    ] as const

    for (const [modo, esperado] of casos) {
      expect(
        rotuloDeAssistir({ provider: netflix, href: 'x', modo }),
      ).toBe(esperado)
    }
  })
})
