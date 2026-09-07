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
  /** Servicos que nao cobram nada — com ou sem anuncio. Separado de
   *  flatrate porque a interface diz "gratis" em vez de "sua assinatura",
   *  e porque quem nao assina nada ainda assim tem o que ver. */
  free: Provider[]
  rent: Provider[]
  buy: Provider[]
  /** Pagina do proprio TMDB com as opcoes daquele titulo no pais. Vinha na
   *  resposta e era descartada; e a reserva de quem clica num servico que
   *  nao esta no mapa de buscas. */
  link: string | null
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
