import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const tmdbFetch = vi.hoisted(() => vi.fn())

vi.mock('@/lib/tmdb/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/tmdb/client')>()
  return { ...actual, tmdbFetch }
})

import { TmdbError } from '@/lib/tmdb/client'
import {
  discoverMovies,
  getAvailability,
  getImdbId,
  getMovieDetail,
  getRegionProviders,
  searchMovies,
} from './queries'

function paginated(results: unknown[]) {
  return { page: 1, results, total_pages: 1, total_results: results.length }
}

const RAW = {
  id: 550,
  title: 'Clube da Luta',
  overview: '...',
  poster_path: '/p.jpg',
  backdrop_path: '/b.jpg',
  release_date: '1999-10-15',
  vote_average: 8.4,
  vote_count: 27000,
}

describe('discoverMovies', () => {
  beforeEach(() => tmdbFetch.mockResolvedValue(paginated([RAW])))
  afterEach(() => vi.clearAllMocks())

  it('sempre envia watch_region e o tipo de monetização', async () => {
    await discoverMovies({})
    const [path, params] = tmdbFetch.mock.calls[0]
    expect(path).toBe('/discover/movie')
    expect(params.watch_region).toBe('BR')
    expect(params.with_watch_monetization_types).toBe('flatrate')
  })

  it('junta vários provedores com pipe, nunca com vírgula', async () => {
    await discoverMovies({ providerIds: [8, 119, 337] })
    const [, params] = tmdbFetch.mock.calls[0]
    expect(params.with_watch_providers).toBe('8|119|337')
  })

  it('não envia with_watch_providers quando a lista está vazia', async () => {
    await discoverMovies({ providerIds: [] })
    const [, params] = tmdbFetch.mock.calls[0]
    expect(params.with_watch_providers).toBeUndefined()
  })

  it('não envia with_genres quando não há gênero', async () => {
    await discoverMovies({})
    const [, params] = tmdbFetch.mock.calls[0]
    expect(params.with_genres).toBeUndefined()
  })

  it('usa popularity.desc como ordenação padrão', async () => {
    await discoverMovies({})
    const [, params] = tmdbFetch.mock.calls[0]
    expect(params.sort_by).toBe('popularity.desc')
  })

  it('repassa gênero, ordenação e página', async () => {
    await discoverMovies({ genreId: 27, sortBy: 'vote_average.desc', page: 3 })
    const [, params] = tmdbFetch.mock.calls[0]
    expect(params.with_genres).toBe(27)
    expect(params.sort_by).toBe('vote_average.desc')
    expect(params.page).toBe(3)
  })

  it('usa o cache de uma hora', async () => {
    await discoverMovies({})
    expect(tmdbFetch.mock.calls[0][2]).toBe(3600)
  })

  it('devolve filmes já mapeados para o domínio', async () => {
    const movies = await discoverMovies({})
    expect(movies[0].posterUrl).toBe('https://image.tmdb.org/t/p/w500/p.jpg')
  })
})

describe('getMovieDetail', () => {
  afterEach(() => vi.clearAllMocks())

  it('traz elenco, vídeos e disponibilidade numa requisição só', async () => {
    tmdbFetch.mockResolvedValueOnce({ ...RAW, runtime: 139 })

    await getMovieDetail(550)

    expect(tmdbFetch).toHaveBeenCalledTimes(1)
    const [path, params] = tmdbFetch.mock.calls[0]
    expect(path).toBe('/movie/550')
    expect(params.append_to_response).toBe('credits,videos,watch/providers')
    expect(params.include_video_language).toBe('pt,en,null')
  })

  it('lê a disponibilidade anexada', async () => {
    tmdbFetch.mockResolvedValueOnce({
      ...RAW,
      runtime: 139,
      'watch/providers': {
        results: {
          BR: {
            flatrate: [
              { provider_id: 8, provider_name: 'Netflix', logo_path: '/n.jpg' },
            ],
          },
        },
      },
    })

    const detail = await getMovieDetail(550)

    expect(detail?.availability.flatrate[0].name).toBe('Netflix')
  })

  it('devolve null quando o filme não existe', async () => {
    tmdbFetch.mockRejectedValueOnce(new TmdbError('nao encontrado', 404))
    await expect(getMovieDetail(999999999)).resolves.toBeNull()
  })

  it('propaga erros que não são 404', async () => {
    tmdbFetch.mockRejectedValueOnce(new TmdbError('limite', 429))
    await expect(getMovieDetail(550)).rejects.toBeInstanceOf(TmdbError)
  })

  it('devolve disponibilidade vazia quando watch/providers não veio', async () => {
    tmdbFetch.mockResolvedValueOnce({ ...RAW, runtime: 139 })

    const detail = await getMovieDetail(550)

    expect(detail?.availability).toEqual({ flatrate: [], rent: [], buy: [] })
  })
})

describe('searchMovies', () => {
  afterEach(() => vi.clearAllMocks())

  it('envia a busca sem parâmetros de provedor, que a API não aceita', async () => {
    tmdbFetch.mockResolvedValue(paginated([RAW]))
    await searchMovies('clube da luta')
    const [path, params] = tmdbFetch.mock.calls[0]
    expect(path).toBe('/search/movie')
    expect(params.query).toBe('clube da luta')
    expect(params.with_watch_providers).toBeUndefined()
    expect(params.watch_region).toBeUndefined()
  })
})

describe('getAvailability', () => {
  afterEach(() => vi.clearAllMocks())

  it('usa o cache de seis horas', async () => {
    tmdbFetch.mockResolvedValue({ results: {} })
    await getAvailability(550)
    expect(tmdbFetch.mock.calls[0][2]).toBe(21600)
  })
})

describe('getRegionProviders', () => {
  afterEach(() => vi.clearAllMocks())

  it('ordena pela prioridade de exibição no Brasil', async () => {
    tmdbFetch.mockResolvedValue({
      results: [
        {
          provider_id: 2142,
          provider_name: 'MGM+ Apple TV Channel',
          logo_path: null,
          display_priorities: { BR: 40 },
        },
        {
          provider_id: 8,
          provider_name: 'Netflix',
          logo_path: null,
          display_priorities: { BR: 0 },
        },
      ],
    })

    const providers = await getRegionProviders()

    expect(providers.map((p) => p.name)).toEqual([
      'Netflix',
      'MGM+ Apple TV Channel',
    ])
  })

  it('joga para o fim quem não tem prioridade definida no Brasil', async () => {
    tmdbFetch.mockResolvedValue({
      results: [
        { provider_id: 1, provider_name: 'Sem prioridade', logo_path: null },
        {
          provider_id: 8,
          provider_name: 'Netflix',
          logo_path: null,
          display_priorities: { BR: 0 },
        },
      ],
    })

    const providers = await getRegionProviders()

    expect(providers[0].name).toBe('Netflix')
  })
})

describe('entradas sem pôster', () => {
  afterEach(() => vi.clearAllMocks())

  it('tira da descoberta o que não tem pôster', async () => {
    tmdbFetch.mockResolvedValue(
      paginated([RAW, { ...RAW, id: 551, poster_path: null }]),
    )

    const movies = await discoverMovies({})

    expect(movies.map((m) => m.id)).toEqual([550])
  })

  it('tira da busca o que não tem pôster', async () => {
    tmdbFetch.mockResolvedValue(
      paginated([{ ...RAW, id: 552, poster_path: null }, RAW]),
    )

    const movies = await searchMovies('qualquer coisa')

    expect(movies.map((m) => m.id)).toEqual([550])
  })
})

describe('discoverMovies com pré-filtro de nota', () => {
  beforeEach(() => tmdbFetch.mockResolvedValue(paginated([RAW])))
  afterEach(() => vi.clearAllMocks())

  it('não envia o pré-filtro quando não há filtro de nota', async () => {
    await discoverMovies({})
    const [, params] = tmdbFetch.mock.calls[0]
    expect(params['vote_average.gte']).toBeUndefined()
    expect(params['vote_count.gte']).toBeUndefined()
  })

  it('repassa o piso de nota e o piso de votos', async () => {
    await discoverMovies({ minVoteAverage: 7.5, minVoteCount: 200 })
    const [, params] = tmdbFetch.mock.calls[0]
    expect(params['vote_average.gte']).toBe(7.5)
    expect(params['vote_count.gte']).toBe(200)
  })
})

describe('getImdbId', () => {
  afterEach(() => vi.clearAllMocks())

  it('busca os ids externos do filme', async () => {
    tmdbFetch.mockResolvedValue({ imdb_id: 'tt0137523' })
    await getImdbId(550)
    const [path] = tmdbFetch.mock.calls[0]
    expect(path).toBe('/movie/550/external_ids')
  })

  it('devolve o tconst', async () => {
    tmdbFetch.mockResolvedValue({ imdb_id: 'tt0137523' })
    expect(await getImdbId(550)).toBe('tt0137523')
  })

  it('devolve null quando o TMDB não conhece o imdb_id', async () => {
    tmdbFetch.mockResolvedValue({ imdb_id: null })
    expect(await getImdbId(550)).toBeNull()
  })

  it('devolve null quando o campo nem vem na resposta', async () => {
    tmdbFetch.mockResolvedValue({})
    expect(await getImdbId(550)).toBeNull()
  })

  it('usa o cache longo de detalhe, de 24 horas', async () => {
    tmdbFetch.mockResolvedValue({ imdb_id: 'tt0137523' })
    await getImdbId(550)
    const [, , revalidate] = tmdbFetch.mock.calls[0]
    expect(revalidate).toBe(60 * 60 * 24)
  })
})
