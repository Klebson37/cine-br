/** Tipos do JSON cru do TMDB. Nenhum arquivo fora de lib/ deve importar daqui. */

export interface RawMovie {
  id: number
  title: string
  overview: string
  poster_path: string | null
  backdrop_path: string | null
  release_date?: string
  vote_average: number
  vote_count: number
  runtime?: number | null
}

export interface RawProvider {
  provider_id: number
  provider_name: string
  logo_path: string | null
  /** Prioridade de exibição por país. O BR tem 86 provedores; sem ordenar
   *  por isso, o painel mistura Netflix com "MGM+ Apple TV Channel". */
  display_priorities?: Record<string, number>
}

export interface RawWatchProviders {
  results: Record<
    string,
    {
      link?: string
      flatrate?: RawProvider[]
      rent?: RawProvider[]
      buy?: RawProvider[]
      ads?: RawProvider[]
    }
  >
}

/** O /discover não devolve imdb_id. Sem esta chamada extra não há como ligar
 *  um filme do TMDB à sua nota no IMDb. */
export interface RawExternalIds {
  imdb_id?: string | null
}

export interface RawCastMember {
  id: number
  name: string
  character: string
  profile_path: string | null
  order: number
}

export interface RawCredits {
  cast: RawCastMember[]
}

export interface RawVideo {
  key: string
  site: string
  type: string
  iso_639_1: string
  official: boolean
}

export interface RawVideos {
  results: RawVideo[]
}

export interface RawPaginated<T> {
  page: number
  results: T[]
  total_pages: number
  total_results: number
}

export interface RawGenre {
  id: number
  name: string
}

export interface RawMovieDetail extends RawMovie {
  credits?: RawCredits
  videos?: RawVideos
  /** Verificado contra a API: `watch/providers` É anexável via
   *  append_to_response, apesar da barra. A página de detalhe faz
   *  uma requisição só. */
  'watch/providers'?: RawWatchProviders
}

/** Serie no TMDB. O formato e quase o do filme, com dois nomes trocados:
 *  `name` no lugar de `title` e `first_air_date` no lugar de
 *  `release_date`. A duracao vem como lista, uma por formato de episodio. */
export interface RawSeries {
  id: number
  name: string
  overview: string
  poster_path: string | null
  backdrop_path: string | null
  first_air_date?: string
  vote_average: number
  vote_count: number
  episode_run_time?: number[]
  number_of_seasons?: number
}

export interface RawSeriesDetail extends RawSeries {
  credits?: RawCredits
  videos?: RawVideos
  'watch/providers'?: RawWatchProviders
}
