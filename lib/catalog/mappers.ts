import { WATCH_REGION } from '@/lib/tmdb/client'
import type {
  RawCredits,
  RawMovie,
  RawProvider,
  RawSeries,
  RawVideos,
  RawWatchProviders,
} from '@/lib/tmdb/schema'
import type { Availability, CastMember, Movie, Provider } from './types'

const IMAGE_BASE = 'https://image.tmdb.org/t/p'
const MAX_CAST = 10

export function imageUrl(path: string | null, size: string): string | null {
  if (!path) return null
  return `${IMAGE_BASE}/${size}${path}`
}

export function toProvider(raw: RawProvider): Provider {
  return {
    id: raw.provider_id,
    name: raw.provider_name,
    logoUrl: imageUrl(raw.logo_path, 'w92'),
  }
}

export function toMovie(raw: RawMovie): Movie {
  return {
    id: raw.id,
    title: raw.title,
    year: parseYear(raw.release_date),
    overview: raw.overview,
    posterUrl: imageUrl(raw.poster_path, 'w500'),
    backdropUrl: imageUrl(raw.backdrop_path, 'w1280'),
    // vote_average vem 0 tanto para "nota zero" quanto para "sem votos".
    // Sem votos é ausência de informação, não nota ruim.
    rating: raw.vote_count > 0 ? raw.vote_average : null,
    runtimeMinutes: raw.runtime ?? null,
  }
}

/** Uma serie no formato do catalogo.
 *
 *  Serie e filme sao o mesmo objeto de exibicao para este app: cartaz,
 *  titulo, ano, nota. O que muda e a rota e a origem dos dados, nao a
 *  forma -- e por isso a grade, a fileira e o cartao servem aos dois sem
 *  saber com qual estao lidando.
 *
 *  A duracao vira a do episodio, que e o numero que ajuda a decidir se da
 *  tempo hoje. A soma da serie inteira nao ajudaria ninguem. */
export function toSeries(raw: RawSeries): Movie {
  return {
    id: raw.id,
    title: raw.name,
    year: parseYear(raw.first_air_date),
    overview: raw.overview,
    posterUrl: imageUrl(raw.poster_path, 'w500'),
    backdropUrl: imageUrl(raw.backdrop_path, 'w1280'),
    rating: raw.vote_count > 0 ? raw.vote_average : null,
    runtimeMinutes: raw.episode_run_time?.[0] ?? null,
  }
}

function parseYear(releaseDate: string | undefined): number | null {
  if (!releaseDate) return null
  const year = Number.parseInt(releaseDate.slice(0, 4), 10)
  return Number.isNaN(year) ? null : year
}

export function toAvailability(raw: RawWatchProviders): Availability {
  // A chave da região some por completo quando o filme não está disponível
  // no país. Isso é resposta legítima, não erro.
  const region = raw.results?.[WATCH_REGION]
  // `free` e `ads` viram um so: para quem vai assistir, a diferenca entre
  // gratis e gratis-com-anuncio nao muda a decisao de abrir o filme.
  const gratis = [...(region?.free ?? []), ...(region?.ads ?? [])].map(
    toProvider,
  )
  const unicos = new Map(gratis.map((p) => [p.id, p]))

  return {
    flatrate: (region?.flatrate ?? []).map(toProvider),
    free: [...unicos.values()],
    rent: (region?.rent ?? []).map(toProvider),
    buy: (region?.buy ?? []).map(toProvider),
    link: region?.link ?? null,
  }
}

/** O elenco principal, com quem tem retrato primeiro.
 *
 *  O TMDB não tem foto de boa parte dos atores — em "La Captura", quatro
 *  dos dez primeiros vêm com profile_path nulo. Ordenar só por billing
 *  deixava buracos no meio da fita. Aqui a ordem de crédito é preservada
 *  dentro de cada grupo, mas quem tem foto ocupa as vagas antes: a fita
 *  fica cheia, e quem entra continua sendo elenco principal.
 *
 *  Quem não tem foto ainda aparece, se sobrar vaga — com as iniciais no
 *  lugar do retrato. É melhor mostrar o nome do que esconder o ator. */
export function toCast(raw: RawCredits | undefined): CastMember[] {
  if (!raw?.cast) return []
  const porCredito = [...raw.cast].sort((a, b) => a.order - b.order)
  const comFoto = porCredito.filter((member) => member.profile_path !== null)
  const semFoto = porCredito.filter((member) => member.profile_path === null)

  return [...comFoto, ...semFoto]
    .slice(0, MAX_CAST)
    .map((member) => ({
      id: member.id,
      name: member.name,
      character: member.character,
      photoUrl: imageUrl(member.profile_path, 'w185'),
    }))
}

export function pickTrailerKey(raw: RawVideos | undefined): string | null {
  const videos = (raw?.results ?? []).filter((v) => v.site === 'YouTube')
  if (videos.length === 0) return null

  // Ordem do spec: trailer em português, trailer em inglês, qualquer teaser.
  const candidates = [
    videos.find((v) => v.type === 'Trailer' && v.iso_639_1 === 'pt'),
    videos.find((v) => v.type === 'Trailer' && v.iso_639_1 === 'en'),
    videos.find((v) => v.type === 'Teaser'),
  ]

  return candidates.find((v) => v !== undefined)?.key ?? null
}
