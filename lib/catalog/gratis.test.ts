import { describe, expect, it } from 'vitest'
import { MONETIZACAO_INCLUIDA, SERVICOS_GRATIS, ehGratis } from './gratis'

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
