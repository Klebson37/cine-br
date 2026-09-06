import { mapWithConcurrency } from '@/lib/concurrency'
import { getImdbRating } from '@/lib/imdb/ratings'
import { getImdbId } from './queries'
import { filterByImdbRating, type MinRating } from './rating-filter'
import type { Movie } from './types'

/** Teto de chamadas simultâneas ao TMDB para resolver imdb_id. Resolver as
 *  quarenta de uma vez convida o 429; serializar deixaria a home fria lenta
 *  sem necessidade. */
export const IMDB_LOOKUP_CONCURRENCY = 8

/**
 * Resolve a nota do IMDb de cada filme, indexada pelo id do TMDB.
 *
 * A deduplicação é o ponto do módulo: um mesmo filme aparece na fileira de
 * populares e na fileira do serviço dele, e sem isso a home pagaria a mesma
 * consulta duas vezes. Falha de rede vira null, que o filtro descarta —
 * um filme a menos é melhor que uma fileira a menos.
 */
export async function resolveImdbRatings(
  tmdbIds: readonly number[],
): Promise<Map<number, number | null>> {
  const unicos = [...new Set(tmdbIds)]

  const notas = await mapWithConcurrency(
    unicos,
    IMDB_LOOKUP_CONCURRENCY,
    async (id) => {
      try {
        const tconst = await getImdbId(id)
        return tconst === null ? null : getImdbRating(tconst)
      } catch {
        return null
      }
    },
  )

  return new Map(unicos.map((id, i) => [id, notas[i]]))
}

/** Filtra várias fileiras com uma única rodada de consultas para o conjunto
 *  todo. A fileira que zera continua na lista: quem some com ela é o
 *  MovieRail, que já devolve null para lista vazia. */
export async function applyRatingToRails(
  rails: readonly Movie[][],
  min: MinRating,
): Promise<Movie[][]> {
  const notas = await resolveImdbRatings(rails.flat().map((movie) => movie.id))
  return rails.map((movies) => filterByImdbRating(movies, notas, min))
}

export async function applyRatingToList(
  movies: readonly Movie[],
  min: MinRating,
): Promise<Movie[]> {
  const [filtrados] = await applyRatingToRails([[...movies]], min)
  return filtrados
}
