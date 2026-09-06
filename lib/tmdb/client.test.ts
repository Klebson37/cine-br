import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TmdbError, tmdbFetch } from './client'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

describe('tmdbFetch', () => {
  beforeEach(() => {
    process.env.TMDB_ACCESS_TOKEN = 'token-de-teste'
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('envia o token como Bearer e acrescenta o idioma', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }))
    vi.stubGlobal('fetch', fetchMock)

    await tmdbFetch('/movie/550')

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toContain('https://api.themoviedb.org/3/movie/550')
    expect(url).toContain('language=pt-BR')
    expect(init.headers.Authorization).toBe('Bearer token-de-teste')
  })

  it('omite parâmetros indefinidos', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }))
    vi.stubGlobal('fetch', fetchMock)

    await tmdbFetch('/discover/movie', { page: 1, with_genres: undefined })

    const [url] = fetchMock.mock.calls[0]
    expect(url).toContain('page=1')
    expect(url).not.toContain('with_genres')
  })

  it('repassa o tempo de revalidação para o cache do Next', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }))
    vi.stubGlobal('fetch', fetchMock)

    await tmdbFetch('/movie/550', {}, 3600)

    const [, init] = fetchMock.mock.calls[0]
    expect(init.next).toEqual({ revalidate: 3600 })
  })

  it('tenta de novo em 429 e devolve o resultado da tentativa seguinte', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ erro: true }, 429))
      .mockResolvedValueOnce(jsonResponse({ id: 550 }))
    vi.stubGlobal('fetch', fetchMock)

    const promise = tmdbFetch<{ id: number }>('/movie/550')
    await vi.advanceTimersByTimeAsync(1000)

    await expect(promise).resolves.toEqual({ id: 550 })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('tenta de novo em 500', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({}, 500))
      .mockResolvedValueOnce(jsonResponse({ id: 550 }))
    vi.stubGlobal('fetch', fetchMock)

    const promise = tmdbFetch<{ id: number }>('/movie/550')
    await vi.advanceTimersByTimeAsync(1000)

    await expect(promise).resolves.toEqual({ id: 550 })
  })

  it('NÃO tenta de novo em 404 e lança TmdbError com o status', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}, 404))
    vi.stubGlobal('fetch', fetchMock)

    await expect(tmdbFetch('/movie/999999999')).rejects.toMatchObject({
      status: 404,
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('desiste depois de três tentativas', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}, 429))
    vi.stubGlobal('fetch', fetchMock)

    const promise = tmdbFetch('/movie/550')
    const assertion = expect(promise).rejects.toBeInstanceOf(TmdbError)
    await vi.advanceTimersByTimeAsync(10_000)
    await assertion

    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('lança quando o token não está configurado', async () => {
    delete process.env.TMDB_ACCESS_TOKEN
    await expect(tmdbFetch('/movie/550')).rejects.toThrow(/TMDB_ACCESS_TOKEN/)
  })
})
