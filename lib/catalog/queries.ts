import { TmdbError, WATCH_REGION, tmdbFetch } from '@/lib/tmdb/client'
import type {
  RawGenre,
  RawMovie,
  RawMovieDetail,
  RawPaginated,
  RawProvider,
  RawWatchProviders,
} from '@/lib/tmdb/schema'
import {
  pickTrailerKey,
  toAvailability,
  toCast,
  toMovie,
  toProvider,
} from './mappers'
import type { Availability, Genre, Movie, MovieDetail, Provider } from './types'

/** Tempos de revalidação em segundos, conforme a tabela de cache do spec. */
export const CACHE = {
  providers: 60 * 60 * 24,
  catalog: 60 * 60,
  detail: 60 * 60 * 24,
  availability: 60 * 60 * 6,
} as const

export const DEFAULT_SORT = 'popularity.desc'

/** Um card de catálogo é o pôster: sem arte ele vira um buraco na grade.
 *  O TMDB devolve, no meio dos filmes, entradas sem pôster que quase sempre
 *  são vídeos soltos catalogados como filme. Elas ficam de fora das listas;
 *  a página de detalhe continua abrindo normalmente para quem chegar nela. */
function comPoster(movies: Movie[]): Movie[] {
  return movies.filter((movie) => movie.posterUrl !== null)
}

export interface DiscoverOptions {
  providerIds?: number[]
  genreId?: number
  sortBy?: string
  page?: number
}

export async function discoverMovies({
  providerIds = [],
  genreId,
  sortBy = DEFAULT_SORT,
  page = 1,
}: DiscoverOptions): Promise<Movie[]> {
  const data = await tmdbFetch<RawPaginated<RawMovie>>(
    '/discover/movie',
    {
      watch_region: WATCH_REGION,
      with_watch_monetization_types: 'flatrate',
      // Pipe significa OU. Vírgula significaria E — filmes presentes em
      // todos os serviços ao mesmo tempo, que não é o que o usuário quer.
      with_watch_providers:
        providerIds.length > 0 ? providerIds.join('|') : undefined,
      with_genres: genreId,
      sort_by: sortBy,
      page,
    },
    CACHE.catalog,
  )
  return comPoster(data.results.map(toMovie))
}

/** O BR devolve 86 provedores, a maioria canais irrelevantes. A ordenação
 *  por display_priorities.BR põe Netflix, Prime, Apple TV e Disney+ no topo. */
export async function getRegionProviders(): Promise<Provider[]> {
  const data = await tmdbFetch<{ results: RawProvider[] }>(
    '/watch/providers/movie',
    { watch_region: WATCH_REGION },
    CACHE.providers,
  )
  return [...data.results]
    .sort(
      (a, b) =>
        (a.display_priorities?.[WATCH_REGION] ?? Number.MAX_SAFE_INTEGER) -
        (b.display_priorities?.[WATCH_REGION] ?? Number.MAX_SAFE_INTEGER),
    )
    .map(toProvider)
}

export async function getGenres(): Promise<Genre[]> {
  const data = await tmdbFetch<{ genres: RawGenre[] }>(
    '/genre/movie/list',
    {},
    CACHE.providers,
  )
  return data.genres
}

export async function getAvailability(id: number): Promise<Availability> {
  const data = await tmdbFetch<RawWatchProviders>(
    `/movie/${id}/watch/providers`,
    {},
    CACHE.availability,
  )
  return toAvailability(data)
}

export async function getMovieDetail(id: number): Promise<MovieDetail | null> {
  let raw: RawMovieDetail
  try {
    // Uma requisição para a página inteira. Verificado contra a API:
    // watch/providers é anexável apesar da barra no nome.
    raw = await tmdbFetch<RawMovieDetail>(
      `/movie/${id}`,
      {
        append_to_response: 'credits,videos,watch/providers',
        include_video_language: 'pt,en,null',
      },
      CACHE.detail,
    )
  } catch (error) {
    if (error instanceof TmdbError && error.status === 404) return null
    throw error
  }

  const rawProviders = raw['watch/providers']

  return {
    ...toMovie(raw),
    availability: rawProviders
      ? toAvailability(rawProviders)
      : { flatrate: [], rent: [], buy: [] },
    trailerYoutubeKey: pickTrailerKey(raw.videos),
    cast: toCast(raw.credits),
  }
}

export async function searchMovies(query: string, page = 1): Promise<Movie[]> {
  // /search/movie NÃO aceita with_watch_providers nem watch_region.
  // A disponibilidade é resolvida depois, por filme. Ver spec.
  const data = await tmdbFetch<RawPaginated<RawMovie>>(
    '/search/movie',
    { query, page, include_adult: 'false' },
    CACHE.catalog,
  )
  return comPoster(data.results.map(toMovie))
}
