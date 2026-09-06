import { describe, expect, it } from 'vitest'
import {
  MIN_VOTE_COUNT,
  filterByImdbRating,
  parseMinRating,
  passesMinRating,
  prefilterVoteAverage,
} from './rating-filter'
import type { Movie } from './types'

function movie(id: number): Movie {
  return {
    id,
    title: `Filme ${id}`,
    year: 1999,
    overview: '',
    posterUrl: '/p.jpg',
    backdropUrl: null,
    rating: 8,
    runtimeMinutes: null,
  }
}

describe('parseMinRating', () => {
  it('aceita os quatro valores oferecidos pela interface', () => {
    expect(parseMinRating('6')).toBe(6)
    expect(parseMinRating('7')).toBe(7)
    expect(parseMinRating('8')).toBe(8)
    expect(parseMinRating('9')).toBe(9)
  })

  it('devolve null quando o parâmetro não veio', () => {
    expect(parseMinRating(undefined)).toBeNull()
    expect(parseMinRating('')).toBeNull()
  })

  it('ignora espaços em volta', () => {
    expect(parseMinRating(' 8 ')).toBe(8)
  })

  it('recusa valores fora da lista, inclusive plausíveis', () => {
    expect(parseMinRating('5')).toBeNull()
    expect(parseMinRating('10')).toBeNull()
    expect(parseMinRating('8.5')).toBeNull()
    expect(parseMinRating('-1')).toBeNull()
    expect(parseMinRating('99')).toBeNull()
    expect(parseMinRating('abc')).toBeNull()
  })
})

describe('prefilterVoteAverage', () => {
  it('desce meio ponto do limite pedido', () => {
    expect(prefilterVoteAverage(8)).toBe(7.5)
    expect(prefilterVoteAverage(6)).toBe(5.5)
    expect(prefilterVoteAverage(9)).toBe(8.5)
  })
})

describe('MIN_VOTE_COUNT', () => {
  it('mantém o piso de votos do TMDB em 200', () => {
    expect(MIN_VOTE_COUNT).toBe(200)
  })
})

describe('passesMinRating', () => {
  it('aceita nota exatamente igual ao limite', () => {
    expect(passesMinRating(8, 8)).toBe(true)
  })

  it('aceita nota acima do limite', () => {
    expect(passesMinRating(8.1, 8)).toBe(true)
  })

  it('recusa nota abaixo do limite', () => {
    expect(passesMinRating(7.9, 8)).toBe(false)
  })

  it('recusa ausência de nota: ausência não satisfaz um limite', () => {
    expect(passesMinRating(null, 8)).toBe(false)
  })
})

describe('filterByImdbRating', () => {
  it('mantém só os filmes que passam o limite', () => {
    const ratings = new Map([
      [1, 8.4],
      [2, 6.1],
      [3, 9.0],
    ])
    const resultado = filterByImdbRating(
      [movie(1), movie(2), movie(3)],
      ratings,
      8,
    )
    expect(resultado.map((m) => m.id)).toEqual([1, 3])
  })

  it('preserva a ordem original, que é a classificação por popularidade', () => {
    const ratings = new Map([
      [3, 8.1],
      [1, 9.5],
      [2, 8.8],
    ])
    const resultado = filterByImdbRating(
      [movie(3), movie(1), movie(2)],
      ratings,
      8,
    )
    expect(resultado.map((m) => m.id)).toEqual([3, 1, 2])
  })

  it('descarta filme ausente do mapa de notas', () => {
    const resultado = filterByImdbRating([movie(1)], new Map(), 8)
    expect(resultado).toEqual([])
  })

  it('descarta filme cuja nota veio null', () => {
    const resultado = filterByImdbRating([movie(1)], new Map([[1, null]]), 8)
    expect(resultado).toEqual([])
  })

  it('devolve lista vazia para entrada vazia', () => {
    expect(filterByImdbRating([], new Map(), 8)).toEqual([])
  })
})
