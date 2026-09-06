import type { Movie } from './types'

/** Os valores oferecidos na barra de filtros. */
export const RATING_OPTIONS = [6, 7, 8, 9] as const
export type MinRating = (typeof RATING_OPTIONS)[number]

/** Folga do pré-filtro do TMDB. As duas notas correlacionam forte e o TMDB
 *  costuma ser a mais generosa das duas, então descer meio ponto antes de
 *  verificar no IMDb é conservador. Fixo de propósito: calibrar por gênero
 *  ou década é sintonia fina cara e impossível de provar melhor. */
export const PREFILTER_SLACK = 0.5

/** Sem piso de votos, vote_average.gte devolve obscuridades com nota 10 e
 *  três votos, e o pré-filtro deixaria passar exatamente o lixo. */
export const MIN_VOTE_COUNT = 200

/** Lista fechada em vez de faixa numérica: a interface só oferece quatro
 *  valores e a URL é entrada não confiável. Mesmo espírito tolerante do
 *  parseProviderCookie — lixo vira ausência, nunca erro. */
export function parseMinRating(raw: string | undefined): MinRating | null {
  if (raw === undefined) return null

  // A string inteira precisa ser dígitos: parseInt('8.5') devolveria 8, e
  // "8,5" viraria silenciosamente "8 ou mais".
  const texto = raw.trim()
  if (!/^\d+$/.test(texto)) return null

  const valor = Number.parseInt(texto, 10)
  return (RATING_OPTIONS as readonly number[]).includes(valor)
    ? (valor as MinRating)
    : null
}

export function prefilterVoteAverage(min: MinRating): number {
  return min - PREFILTER_SLACK
}

/** Ausência de nota não satisfaz um limite: se o filtro diz "8 ou mais",
 *  tudo que aparece tem nota comprovada de 8 para cima. */
export function passesMinRating(
  imdbRating: number | null,
  min: MinRating,
): boolean {
  return imdbRating !== null && imdbRating >= min
}

/** Mantém a ordem original: ela é a classificação por popularidade, e
 *  reordenar faria a numeração da fileira de ranking mentir. */
export function filterByImdbRating(
  movies: readonly Movie[],
  ratings: ReadonlyMap<number, number | null>,
  min: MinRating,
): Movie[] {
  return movies.filter((movie) =>
    passesMinRating(ratings.get(movie.id) ?? null, min),
  )
}
