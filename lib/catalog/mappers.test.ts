import { describe, expect, it } from 'vitest'
import type { RawMovie, RawVideos, RawWatchProviders } from '@/lib/tmdb/schema'
import {
  imageUrl,
  pickTrailerKey,
  toAvailability,
  toCast,
  toMovie,
} from './mappers'

function rawMovie(overrides: Partial<RawMovie> = {}): RawMovie {
  return {
    id: 550,
    title: 'Clube da Luta',
    overview: 'Um homem insone...',
    poster_path: '/poster.jpg',
    backdrop_path: '/backdrop.jpg',
    release_date: '1999-10-15',
    vote_average: 8.4,
    vote_count: 27000,
    ...overrides,
  }
}

describe('imageUrl', () => {
  it('monta a URL completa', () => {
    expect(imageUrl('/abc.jpg', 'w500')).toBe(
      'https://image.tmdb.org/t/p/w500/abc.jpg',
    )
  })

  it('devolve null quando não há caminho', () => {
    expect(imageUrl(null, 'w500')).toBeNull()
  })
})

describe('toMovie', () => {
  it('converte um filme completo', () => {
    const movie = toMovie(rawMovie())
    expect(movie).toEqual({
      id: 550,
      title: 'Clube da Luta',
      year: 1999,
      overview: 'Um homem insone...',
      posterUrl: 'https://image.tmdb.org/t/p/w500/poster.jpg',
      backdropUrl: 'https://image.tmdb.org/t/p/w1280/backdrop.jpg',
      rating: 8.4,
      runtimeMinutes: null,
    })
  })

  it('aceita poster_path nulo', () => {
    expect(toMovie(rawMovie({ poster_path: null })).posterUrl).toBeNull()
  })

  it('aceita backdrop_path nulo', () => {
    expect(toMovie(rawMovie({ backdrop_path: null })).backdropUrl).toBeNull()
  })

  it('devolve ano nulo quando a data de lançamento vem vazia', () => {
    expect(toMovie(rawMovie({ release_date: '' })).year).toBeNull()
  })

  it('devolve ano nulo quando a data de lançamento não vem', () => {
    expect(toMovie(rawMovie({ release_date: undefined })).year).toBeNull()
  })

  it('devolve nota nula quando ninguém votou', () => {
    const movie = toMovie(rawMovie({ vote_average: 0, vote_count: 0 }))
    expect(movie.rating).toBeNull()
  })

  it('preserva nota zero legítima quando houve votos', () => {
    const movie = toMovie(rawMovie({ vote_average: 0, vote_count: 12 }))
    expect(movie.rating).toBe(0)
  })

  it('converte a duração quando presente', () => {
    expect(toMovie(rawMovie({ runtime: 139 })).runtimeMinutes).toBe(139)
  })

  it('trata duração nula', () => {
    expect(toMovie(rawMovie({ runtime: null })).runtimeMinutes).toBeNull()
  })
})

describe('toAvailability', () => {
  const raw: RawWatchProviders = {
    results: {
      BR: {
        flatrate: [
          { provider_id: 8, provider_name: 'Netflix', logo_path: '/n.jpg' },
        ],
        rent: [
          { provider_id: 2, provider_name: 'Apple TV', logo_path: '/a.jpg' },
        ],
      },
      US: {
        flatrate: [
          { provider_id: 15, provider_name: 'Hulu', logo_path: '/h.jpg' },
        ],
      },
    },
  }

  it('lê apenas a região BR', () => {
    const availability = toAvailability(raw)
    expect(availability.flatrate).toEqual([
      {
        id: 8,
        name: 'Netflix',
        logoUrl: 'https://image.tmdb.org/t/p/w92/n.jpg',
      },
    ])
    expect(availability.rent).toHaveLength(1)
    expect(availability.buy).toEqual([])
  })

  it('devolve listas vazias quando não existe a chave BR', () => {
    const semBr: RawWatchProviders = { results: { US: { flatrate: [] } } }
    expect(toAvailability(semBr)).toEqual({
      flatrate: [],
      free: [],
      rent: [],
      buy: [],
      link: null,
    })
  })

  it('devolve listas vazias quando results vem vazio', () => {
    expect(toAvailability({ results: {} })).toEqual({
      flatrate: [],
      free: [],
      rent: [],
      buy: [],
      link: null,
    })
  })
})

describe('pickTrailerKey', () => {
  function video(overrides: Partial<RawVideos['results'][0]>) {
    return {
      key: 'abc',
      site: 'YouTube',
      type: 'Trailer',
      iso_639_1: 'pt',
      official: true,
      ...overrides,
    }
  }

  it('prefere trailer em português', () => {
    const videos: RawVideos = {
      results: [
        video({ key: 'ingles', iso_639_1: 'en' }),
        video({ key: 'portugues', iso_639_1: 'pt' }),
      ],
    }
    expect(pickTrailerKey(videos)).toBe('portugues')
  })

  it('cai para trailer em inglês quando não há português', () => {
    const videos: RawVideos = {
      results: [video({ key: 'ingles', iso_639_1: 'en' })],
    }
    expect(pickTrailerKey(videos)).toBe('ingles')
  })

  it('cai para teaser quando não há trailer', () => {
    const videos: RawVideos = {
      results: [video({ key: 'teaser', type: 'Teaser', iso_639_1: 'en' })],
    }
    expect(pickTrailerKey(videos)).toBe('teaser')
  })

  it('ignora vídeos que não são do YouTube', () => {
    const videos: RawVideos = {
      results: [video({ key: 'vimeo', site: 'Vimeo' })],
    }
    expect(pickTrailerKey(videos)).toBeNull()
  })

  it('devolve null quando a lista está vazia', () => {
    expect(pickTrailerKey({ results: [] })).toBeNull()
  })

  it('devolve null quando videos não veio na resposta', () => {
    expect(pickTrailerKey(undefined)).toBeNull()
  })
})

describe('toCast', () => {
  it('ordena por order e limita a dez', () => {
    const credits = {
      cast: Array.from({ length: 15 }, (_, i) => ({
        id: i,
        name: `Ator ${i}`,
        character: `Personagem ${i}`,
        profile_path: '/p.jpg',
        order: 15 - i,
      })),
    }
    const cast = toCast(credits)
    expect(cast).toHaveLength(10)
    expect(cast[0].name).toBe('Ator 14')
  })

  it('devolve lista vazia quando credits não veio', () => {
    expect(toCast(undefined)).toEqual([])
  })
})

describe('toCast — retratos', () => {
  function ator(id: number, order: number, foto: string | null) {
    return {
      id,
      name: `Ator ${id}`,
      character: `Personagem ${id}`,
      profile_path: foto,
      order,
    }
  }

  it('põe quem tem foto antes de quem não tem', () => {
    const cast = toCast({
      cast: [ator(1, 0, null), ator(2, 1, '/b.jpg'), ator(3, 2, null)],
    })
    expect(cast.map((c) => c.id)).toEqual([2, 1, 3])
  })

  it('preserva a ordem de crédito dentro de cada grupo', () => {
    const cast = toCast({
      cast: [ator(3, 2, '/c.jpg'), ator(1, 0, '/a.jpg'), ator(2, 1, '/b.jpg')],
    })
    expect(cast.map((c) => c.id)).toEqual([1, 2, 3])
  })

  it('não esconde quem não tem foto: mostra o nome sem retrato', () => {
    const cast = toCast({ cast: [ator(1, 0, null)] })
    expect(cast).toHaveLength(1)
    expect(cast[0].photoUrl).toBeNull()
  })

  it('enche as dez vagas com quem tem foto quando existe gente suficiente', () => {
    const semFoto = Array.from({ length: 5 }, (_, i) => ator(i + 1, i, null))
    const comFoto = Array.from({ length: 10 }, (_, i) =>
      ator(i + 100, i + 5, `/f${i}.jpg`),
    )
    const cast = toCast({ cast: [...semFoto, ...comFoto] })
    expect(cast).toHaveLength(10)
    expect(cast.every((c) => c.photoUrl !== null)).toBe(true)
  })
})
