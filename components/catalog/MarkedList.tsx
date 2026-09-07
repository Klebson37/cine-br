import { mapWithConcurrency } from '@/lib/concurrency'
import { getMovieDetail } from '@/lib/catalog/queries'
import { classifyAvailability } from '@/lib/catalog/search-availability'
import type { AvailabilityLabel } from '@/lib/catalog/search-availability'
import type { Movie } from '@/lib/catalog/types'
import { getCurrentUser, listMarkedIds } from '@/lib/marks/queries'
import { MARK_LABEL, type MarkState } from '@/lib/marks/types'
import { readSelectedProviderIds } from '@/lib/preferences.server'
import { EmptyState } from './EmptyState'
import { MovieGrid } from './MovieGrid'

/** Teto de detalhes buscados ao mesmo tempo. Mesmo número usado para
 *  resolver o imdb_id: protege do 429 do TMDB sem serializar. */
const CONCORRENCIA = 8

export async function MarkedList({ state }: { state: MarkState }) {
  const user = await getCurrentUser()

  if (!user) {
    return (
      <EmptyState
        title="Entre para montar suas listas."
        hint={`Com uma conta, você marca o que quer ver e o que já viu. A lista "${MARK_LABEL[state]}" fica guardada e te espera em qualquer aparelho.`}
        actionLabel="Voltar ao catálogo"
      />
    )
  }

  const [ids, selectedIds] = await Promise.all([
    listMarkedIds(state),
    readSelectedProviderIds(),
  ])

  if (ids.length === 0) {
    return (
      <EmptyState
        title={`Nada em "${MARK_LABEL[state]}" ainda.`}
        hint="Passe pelo catálogo e use o botão sobre o pôster para marcar um filme."
        actionLabel="Ir para o catálogo"
      />
    )
  }

  // getMovieDetail traz filme e disponibilidade numa requisição só, cacheada
  // 24h — por isso a tabela guarda só o id, sem cópia de título ou pôster.
  const detalhes = await mapWithConcurrency(ids, CONCORRENCIA, (id) =>
    getMovieDetail(id).catch(() => null),
  )

  const movies: Movie[] = []
  const availability = new Map<number, AvailabilityLabel>()

  for (const detalhe of detalhes) {
    // Filme apagado do TMDB, ou requisição que falhou: sai da grade. A linha
    // continua no banco, sem incomodar ninguém.
    if (!detalhe) continue
    movies.push(detalhe)
    availability.set(
      detalhe.id,
      classifyAvailability(detalhe.availability, selectedIds),
    )
  }

  const marks = new Map(movies.map((movie) => [movie.id, state]))

  return (
    <MovieGrid
      movies={movies}
      availability={availability}
      marks={marks}
      signedIn
    />
  )
}
