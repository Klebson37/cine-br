import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const getImdbId = vi.hoisted(() => vi.fn())
const getImdbRating = vi.hoisted(() => vi.fn())

vi.mock('./queries', () => ({ getImdbId }))
vi.mock('@/lib/imdb/ratings', () => ({ getImdbRating }))

import {
  applyRatingToList,
  applyRatingToRails,
  resolveImdbRatings,
} from './rated-discovery'
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

/** tconst previsível a partir do id do TMDB, para os testes casarem os dois. */
function tconst(id: number): string {
  return `tt${String(id).padStart(7, '0')}`
}

describe('resolveImdbRatings', () => {
  beforeEach(() => {
    getImdbId.mockImplementation(async (id: number) => tconst(id))
    getImdbRating.mockReturnValue(8.5)
  })

  afterEach(() => vi.clearAllMocks())

  it('devolve a nota de cada filme, indexada pelo id do TMDB', async () => {
    const notas = await resolveImdbRatings([1, 2])
    expect(notas.get(1)).toBe(8.5)
    expect(notas.get(2)).toBe(8.5)
  })

  it('consulta cada filme uma única vez, mesmo repetido entre fileiras', async () => {
    await resolveImdbRatings([1, 2, 1, 2, 1])
    expect(getImdbId).toHaveBeenCalledTimes(2)
  })

  it('trata falha de rede como ausência de nota, sem propagar o erro', async () => {
    getImdbId.mockImplementation(async (id: number) => {
      if (id === 2) throw new Error('TMDB respondeu 500')
      return tconst(id)
    })
    const notas = await resolveImdbRatings([1, 2])
    expect(notas.get(1)).toBe(8.5)
    expect(notas.get(2)).toBeNull()
  })

  it('trata imdb_id ausente como ausência de nota', async () => {
    getImdbId.mockResolvedValue(null)
    const notas = await resolveImdbRatings([1])
    expect(notas.get(1)).toBeNull()
    expect(getImdbRating).not.toHaveBeenCalled()
  })

  it('não passa de oito consultas simultâneas', async () => {
    let vivas = 0
    let pico = 0
    getImdbId.mockImplementation(async (id: number) => {
      vivas++
      pico = Math.max(pico, vivas)
      await new Promise((r) => setTimeout(r, 1))
      vivas--
      return tconst(id)
    })

    await resolveImdbRatings(Array.from({ length: 40 }, (_, i) => i + 1))
    expect(pico).toBeLessThanOrEqual(8)
  })

  it('devolve mapa vazio sem consultar nada', async () => {
    const notas = await resolveImdbRatings([])
    expect(notas.size).toBe(0)
    expect(getImdbId).not.toHaveBeenCalled()
  })
})

describe('applyRatingToRails', () => {
  beforeEach(() => {
    getImdbId.mockImplementation(async (id: number) => tconst(id))
    getImdbRating.mockImplementation((t: string) =>
      t === tconst(2) ? 6.4 : 8.7,
    )
  })

  afterEach(() => vi.clearAllMocks())

  it('filtra cada fileira mantendo a estrutura de fileiras', async () => {
    const fileiras = await applyRatingToRails(
      [
        [movie(1), movie(2)],
        [movie(2), movie(3)],
      ],
      8,
    )
    expect(fileiras).toHaveLength(2)
    expect(fileiras[0].map((m) => m.id)).toEqual([1])
    expect(fileiras[1].map((m) => m.id)).toEqual([3])
  })

  it('resolve o filme repetido entre fileiras uma única vez', async () => {
    await applyRatingToRails(
      [
        [movie(1), movie(2)],
        [movie(2), movie(3)],
      ],
      8,
    )
    expect(getImdbId).toHaveBeenCalledTimes(3)
  })

  it('deixa a fileira vazia quando nada passa, sem removê-la da lista', async () => {
    const fileiras = await applyRatingToRails([[movie(2)]], 8)
    expect(fileiras).toHaveLength(1)
    expect(fileiras[0]).toEqual([])
  })
})

describe('applyRatingToList', () => {
  beforeEach(() => {
    getImdbId.mockImplementation(async (id: number) => tconst(id))
    getImdbRating.mockImplementation((t: string) =>
      t === tconst(2) ? 6.4 : 8.7,
    )
  })

  afterEach(() => vi.clearAllMocks())

  it('filtra uma lista simples', async () => {
    const filmes = await applyRatingToList([movie(1), movie(2), movie(3)], 8)
    expect(filmes.map((m) => m.id)).toEqual([1, 3])
  })
})
