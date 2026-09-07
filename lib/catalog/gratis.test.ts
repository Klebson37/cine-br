import { describe, expect, it } from 'vitest'
import {
  IDS_GRATIS,
  MONETIZACAO_INCLUIDA,
  MONETIZACAO_SEM_CUSTO,
  SERVICOS_GRATIS,
  SERVICOS_GRATIS_LISTA,
  ehGratis,
} from './gratis'

describe('serviços grátis', () => {
  it('reconhece os que não cobram assinatura', () => {
    expect(ehGratis(300)).toBe(true) // Pluto TV
    expect(ehGratis(2302)).toBe(true) // Mercado Play
    expect(ehGratis(544)).toBe(true) // Libreflix
  })

  it('não confunde serviço pago com grátis', () => {
    expect(ehGratis(8)).toBe(false) // Netflix
    expect(ehGratis(1899)).toBe(false) // HBO Max
    expect(ehGratis(119)).toBe(false) // Amazon Prime Video
  })

  it('a lista não está vazia — o painel depende dela para o selo', () => {
    expect(SERVICOS_GRATIS.size).toBeGreaterThan(4)
  })
})

describe('MONETIZACAO_INCLUIDA', () => {
  it('inclui assinatura, grátis e com anúncio', () => {
    const tipos = MONETIZACAO_INCLUIDA.split('|')
    expect(tipos).toEqual(
      expect.arrayContaining(['flatrate', 'free', 'ads']),
    )
  })

  it('deixa aluguel e compra de fora: eles cobram por título', () => {
    const tipos = MONETIZACAO_INCLUIDA.split('|')
    expect(tipos).not.toContain('rent')
    expect(tipos).not.toContain('buy')
  })

  it('usa pipe, que é OU no TMDB — vírgula pediria todos ao mesmo tempo', () => {
    expect(MONETIZACAO_INCLUIDA).not.toContain(',')
  })
})

describe('SERVICOS_GRATIS_LISTA', () => {
  it('esta ordenada do maior acervo para o menor', () => {
    const acervos = SERVICOS_GRATIS_LISTA.map((s) => s.acervo)
    expect([...acervos].sort((a, b) => b - a)).toEqual(acervos)
  })

  it('nao repete servico', () => {
    const ids = SERVICOS_GRATIS_LISTA.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('nao lista o Plex Channel, que e o mesmo acervo do Plex', () => {
    // 12.036 contra 11.926: a pagina mostraria a mesma prateleira duas vezes.
    expect(SERVICOS_GRATIS_LISTA.some((s) => s.id === 2077)).toBe(false)
    // Mas ele continua contando como gratuito no painel e no selo.
    expect(ehGratis(2077)).toBe(true)
  })

  it('todo servico da lista conta como gratuito', () => {
    for (const s of SERVICOS_GRATIS_LISTA) expect(ehGratis(s.id)).toBe(true)
  })

  it('IDS_GRATIS junta todos com pipe, que e OU no TMDB', () => {
    const ids = IDS_GRATIS.split('|').map(Number)
    expect(ids).toHaveLength(SERVICOS_GRATIS.size)
    expect(IDS_GRATIS).not.toContain(',')
  })
})

describe('MONETIZACAO_SEM_CUSTO', () => {
  it('nao deixa assinatura entrar na secao Gratis', () => {
    // Alguem abriria "Gratis" e encontraria um filme que precisa de Netflix.
    expect(MONETIZACAO_SEM_CUSTO.split('|')).toEqual(['free', 'ads'])
  })
})
