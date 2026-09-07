import { describe, expect, it } from 'vitest'
import {
  MAX_PROVIDERS,
  parseProviderCookie,
  serializeProviderCookie,
} from './preferences'

describe('parseProviderCookie', () => {
  it('lê uma lista de ids', () => {
    expect(parseProviderCookie('8,119,337')).toEqual([8, 119, 337])
  })

  it('devolve lista vazia quando o cookie não existe', () => {
    expect(parseProviderCookie(undefined)).toEqual([])
  })

  it('devolve lista vazia para cookie vazio', () => {
    expect(parseProviderCookie('')).toEqual([])
  })

  it('descarta pedaços que não são número', () => {
    expect(parseProviderCookie('8,abc,119')).toEqual([8, 119])
  })

  it('descarta ids negativos e zero', () => {
    expect(parseProviderCookie('8,-1,0,119')).toEqual([8, 119])
  })

  it('remove duplicatas', () => {
    expect(parseProviderCookie('8,8,119')).toEqual([8, 119])
  })

  it('corta no limite de provedores', () => {
    expect(
      parseProviderCookie('1,2,3,4,5,6,7,8,9,10,11,12'),
    ).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    expect(MAX_PROVIDERS).toBe(10)
  })

  it('nao corta quem esta dentro do limite', () => {
    expect(parseProviderCookie('1,2,3,4,5,6')).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('sobrevive a lixo completo sem lançar', () => {
    expect(parseProviderCookie('%%%;;;')).toEqual([])
  })
})

describe('serializeProviderCookie', () => {
  it('grava ids separados por vírgula', () => {
    expect(serializeProviderCookie([8, 119])).toBe('8,119')
  })

  it('aplica o limite ao gravar', () => {
    const excedentes = Array.from({ length: MAX_PROVIDERS + 2 }, (_, i) => i + 1)
    const esperado = Array.from({ length: MAX_PROVIDERS }, (_, i) => i + 1)
    expect(serializeProviderCookie(excedentes)).toBe(esperado.join(','))
  })

  it('grava string vazia para lista vazia', () => {
    expect(serializeProviderCookie([])).toBe('')
  })

  it('remove duplicatas ao gravar', () => {
    expect(serializeProviderCookie([8, 8, 119])).toBe('8,119')
  })
})
