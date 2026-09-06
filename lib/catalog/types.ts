/** Domínio do app. Nada aqui menciona o TMDB. */

export interface Provider {
  id: number
  name: string
  logoUrl: string | null
}

export interface Movie {
  id: number
  title: string
  year: number | null
  overview: string
  posterUrl: string | null
  backdropUrl: string | null
  /** null quando nunca foi votado — 0 seria mentira, não ausência. */
  rating: number | null
  runtimeMinutes: number | null
}

export interface Availability {
  flatrate: Provider[]
  rent: Provider[]
  buy: Provider[]
}

export interface CastMember {
  id: number
  name: string
  character: string
  photoUrl: string | null
}

export interface MovieDetail extends Movie {
  availability: Availability
  trailerYoutubeKey: string | null
  cast: CastMember[]
}

export interface Genre {
  id: number
  name: string
}
