import { describe, expect, it } from 'vitest'
import {
  decodeRatingsIndex,
  encodeRatingsIndex,
  lookupRating,
  parseTconst,
} from './format'

const ENTRADAS = [
  { id: 111161, rating: 9.3 },
  { id: 68646, rating: 9.2 },
  { id: 468569, rating: 9.0 },
  { id: 137523, rating: 8.8 },
  { id: 3896198, rating: 6.8 },
]

function indice() {
  return decodeRatingsIndex(encodeRatingsIndex(ENTRADAS))
}

describe('parseTconst', () => {
  it('converte a forma canônica', () => {
    expect(parseTconst('tt0111161')).toBe(111161)
  })

  it('aceita tconst sem zeros à esquerda', () => {
    expect(parseTconst('tt3896198')).toBe(3896198)
  })

  it('devolve null para qualquer outra forma', () => {
    expect(parseTconst('nm0000138')).toBeNull()
    expect(parseTconst('tt')).toBeNull()
    expect(parseTconst('0111161')).toBeNull()
    expect(parseTconst('tt01a1161')).toBeNull()
    expect(parseTconst('')).toBeNull()
  })
})

describe('encodeRatingsIndex e decodeRatingsIndex', () => {
  it('grava 4 + 5N bytes', () => {
    expect(encodeRatingsIndex(ENTRADAS).byteLength).toBe(4 + 5 * 5)
  })

  it('ordena os ids em ordem crescente, qualquer que seja a entrada', () => {
    const { ids } = indice()
    expect([...ids]).toEqual([68646, 111161, 137523, 468569, 3896198])
  })

  it('mantém cada nota junto do seu id depois da ordenação', () => {
    const { ids, ratings } = indice()
    const posicao = ids.indexOf(111161)
    expect(ratings[posicao] / 10).toBeCloseTo(9.3)
  })

  it('aceita índice vazio', () => {
    const { ids } = decodeRatingsIndex(encodeRatingsIndex([]))
    expect(ids.length).toBe(0)
  })

  it('recusa um arquivo com tamanho incompatível com o cabeçalho', () => {
    const bytes = encodeRatingsIndex(ENTRADAS)
    expect(() => decodeRatingsIndex(bytes.slice(0, 12))).toThrow(/corrompido/i)
  })

  it('decodifica mesmo com byteOffset diferente de zero', () => {
    // readFileSync devolve Buffer, que pode vir de um pool com deslocamento.
    const original = encodeRatingsIndex(ENTRADAS)
    const maior = new Uint8Array(3 + original.byteLength)
    maior.set(original, 3)
    const deslocado = maior.subarray(3)
    expect(lookupRating(decodeRatingsIndex(deslocado), 'tt0111161')).toBeCloseTo(
      9.3,
    )
  })
})

describe('lookupRating', () => {
  it('acha o primeiro elemento', () => {
    expect(lookupRating(indice(), 'tt0068646')).toBeCloseTo(9.2)
  })

  it('acha o último elemento', () => {
    expect(lookupRating(indice(), 'tt3896198')).toBeCloseTo(6.8)
  })

  it('acha um elemento do meio', () => {
    expect(lookupRating(indice(), 'tt0137523')).toBeCloseTo(8.8)
  })

  it('devolve null para tconst ausente do índice', () => {
    expect(lookupRating(indice(), 'tt9999999')).toBeNull()
  })

  it('devolve null para tconst malformado, sem varrer o índice', () => {
    expect(lookupRating(indice(), 'lixo')).toBeNull()
  })

  it('devolve null em índice vazio', () => {
    const vazio = decodeRatingsIndex(encodeRatingsIndex([]))
    expect(lookupRating(vazio, 'tt0111161')).toBeNull()
  })
})
