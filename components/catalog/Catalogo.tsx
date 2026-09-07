import { FilterBar } from '@/components/filters/FilterBar'
import { ListTabs, type TabKey } from '@/components/layout/ListTabs'
import { resolveHomeMode } from '@/lib/catalog/home-mode'
import type { MediaApi } from '@/lib/catalog/media'
import { TAMANHO_RANKING, buildRailSpecs } from '@/lib/catalog/rails'
import {
  applyRatingToList,
  applyRatingToRails,
} from '@/lib/catalog/rated-discovery'
import {
  MIN_VOTE_COUNT,
  parseMinRating,
  prefilterVoteAverage,
  type MinRating,
} from '@/lib/catalog/rating-filter'
import type { Genre, Movie, Provider } from '@/lib/catalog/types'
import type { MarkState } from '@/lib/marks/types'
import { FeaturedMovie } from './FeaturedMovie'
import { MovieGrid } from './MovieGrid'
import { MovieRail } from './MovieRail'

export interface CatalogoParams {
  genre?: string
  sort?: string
  rating?: string
}

interface CatalogoProps {
  api: MediaApi
  aba: TabKey
  params: CatalogoParams
  selectedProviders: Provider[]
  selectedIds: number[]
  genres: Genre[]
  /** Marcações da pessoa. Ausente na seção de séries: a tabela guarda um id
   *  só, e os ids de série e de filme são numerações separadas no TMDB —
   *  marcar a série 1399 apagaria o filme 1399 da lista. */
  marks?: ReadonlyMap<number, MarkState>
  signedIn?: boolean
}

/** A lista de uma seção do catálogo — filmes ou séries.
 *
 *  Sem filtro nenhum mostra destaque e fileiras; com gênero ou ordenação,
 *  vira grade única. A nota entra nos dois modos, porque é aplicada dentro
 *  das listas em vez de trocar o modo. */
export async function Catalogo({
  api,
  aba,
  params,
  selectedProviders,
  selectedIds,
  genres,
  marks,
  signedIn = false,
}: CatalogoProps) {
  const mode = resolveHomeMode(params)
  // Convertida uma vez, aqui: daqui para baixo ninguém mais vê string.
  const minRating = parseMinRating(params.rating)

  const comum = {
    api,
    aba,
    genres,
    minRating,
    marks,
    signedIn,
  }

  return mode === 'discovery' ? (
    <Descoberta {...comum} selectedProviders={selectedProviders} />
  ) : (
    <Grade
      {...comum}
      providerIds={selectedIds}
      genre={params.genre}
      sort={params.sort}
    />
  )
}

interface ModoComum {
  api: MediaApi
  aba: TabKey
  genres: Genre[]
  minRating: MinRating | null
  marks?: ReadonlyMap<number, MarkState>
  signedIn: boolean
}

/** Qual serviço já inclui o destaque. Prefere um que o usuário assina; sem
 *  seleção, mostra o primeiro que tem o título na assinatura. */
async function resolveIncluded(
  api: MediaApi,
  movie: Movie | undefined,
  selectedIds: number[],
): Promise<{ provider: Provider; mine: boolean } | null> {
  if (!movie) return null

  const availability = await api.availability(movie.id).catch(() => null)
  if (!availability) return null

  const mine = availability.flatrate.find((p) => selectedIds.includes(p.id))
  if (mine) return { provider: mine, mine: true }

  const outro = availability.flatrate[0]
  return outro ? { provider: outro, mine: false } : null
}

async function Descoberta({
  api,
  aba,
  genres,
  minRating,
  marks,
  signedIn,
  selectedProviders,
}: ModoComum & { selectedProviders: Provider[] }) {
  const specs = buildRailSpecs(selectedProviders, minRating !== null)
  const byId = new Map(selectedProviders.map((p) => [p.id, p]))

  // Buscadas em paralelo. Uma fileira que falha vira lista vazia e some,
  // em vez de derrubar a página inteira.
  const results = await Promise.all(
    specs.map((spec) =>
      api
        .discover({
          providerIds: spec.providerIds,
          minVoteAverage:
            minRating === null ? undefined : prefilterVoteAverage(minRating),
          minVoteCount: minRating === null ? undefined : MIN_VOTE_COUNT,
        })
        .catch(() => [] as Movie[]),
    ),
  )

  // Uma rodada de consultas ao IMDb para o conjunto todo, deduplicado.
  const filtrados =
    minRating === null
      ? results
      : await applyRatingToRails(results, minRating, api.kind)

  const featured = filtrados[0]?.[0]
  const included = await resolveIncluded(
    api,
    featured,
    selectedProviders.map((p) => p.id),
  )

  const rails = specs.map((spec, index) => ({
    spec,
    // A primeira fileira é uma classificação: mostra os dez primeiros na
    // ordem exata, sem tirar o destaque do topo — tirar deslocaria todas as
    // posições e a numeração passaria a mentir. O corte vem DEPOIS do filtro
    // de nota: cortar antes entregaria três títulos sob um título de dez.
    movies:
      index === 0 ? filtrados[0].slice(0, TAMANHO_RANKING) : filtrados[index],
    ranked: index === 0,
    // Só as fileiras de um serviço só carregam a marca no título.
    provider:
      spec.providerIds.length === 1 ? byId.get(spec.providerIds[0]) : undefined,
  }))

  return (
    <>
      <FeaturedMovie
        movie={featured}
        selectedCount={selectedProviders.length}
        included={included}
        base={api.item}
      />

      <div className="wrap mt-6">
        <ListTabs active={aba} />
        <div className="mt-6">
          <FilterBar
            genres={genres}
            activeRating={minRating}
            base={api.lista}
          />
        </div>
      </div>

      <div className="palco">
        {rails.map(({ spec, movies, provider, ranked }) => (
          <MovieRail
            key={spec.key}
            title={spec.title}
            movies={movies}
            provider={provider}
            ranked={ranked}
            marks={marks}
            signedIn={signedIn}
            base={api.item}
          />
        ))}
      </div>
    </>
  )
}

async function Grade({
  api,
  aba,
  genres,
  minRating,
  marks,
  signedIn,
  providerIds,
  genre,
  sort,
}: ModoComum & {
  providerIds: number[]
  genre?: string
  sort?: string
}) {
  const encontrados = await api.discover({
    providerIds,
    genreId: genre ? Number.parseInt(genre, 10) : undefined,
    sortBy: sort || undefined,
    minVoteAverage:
      minRating === null ? undefined : prefilterVoteAverage(minRating),
    minVoteCount: minRating === null ? undefined : MIN_VOTE_COUNT,
  })

  const movies =
    minRating === null
      ? encontrados
      : await applyRatingToList(encontrados, minRating, api.kind)

  return (
    <div className="wrap pt-10">
      <ListTabs active={aba} />
      <div className="mt-6">
        <FilterBar
          genres={genres}
          activeGenre={genre}
          activeSort={sort}
          activeRating={minRating}
          base={api.lista}
        />
      </div>
      <div className="mt-10">
        <MovieGrid
          movies={movies}
          marks={marks}
          signedIn={signedIn}
          base={api.item}
        />
      </div>
    </div>
  )
}
