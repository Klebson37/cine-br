import {
  discoverMovies,
  discoverSeries,
  getAvailability,
  getGenres,
  getMovieDetail,
  getSeriesDetail,
  getSeriesGenres,
  type DiscoverOptions,
  type MediaKind,
} from './queries'
import type { Availability, Genre, Movie, MovieDetail } from './types'

/**
 * As duas seções do catálogo, cada uma com o conjunto de consultas que
 * responde por ela.
 *
 * Filme e série se exibem igual — cartaz, título, ano, nota, onde assistir
 * — e o que muda é de onde vêm os dados e para onde levam os links. Juntar
 * as duas diferenças num objeto só deixa a página de lista e a de detalhe
 * servirem as duas seções sem saber qual está montando, e sem duplicar
 * duzentas linhas de arranjo de fileiras.
 */
export interface MediaApi {
  kind: MediaKind
  /** Endereço da lista. A seção de filmes é a home, então é a raiz. */
  lista: string
  /** Prefixo do endereço de cada título: `${item}/${id}`. */
  item: string
  /** Como chamar um item na interface, no singular e no plural. */
  nome: { singular: string; plural: string }
  discover(options: DiscoverOptions): Promise<Movie[]>
  genres(): Promise<Genre[]>
  detail(id: number): Promise<MovieDetail | null>
  availability(id: number): Promise<Availability>
}

export const FILMES: MediaApi = {
  kind: 'movie',
  lista: '/',
  item: '/movie',
  nome: { singular: 'filme', plural: 'filmes' },
  discover: discoverMovies,
  genres: getGenres,
  detail: getMovieDetail,
  availability: (id) => getAvailability(id, 'movie'),
}

export const SERIES: MediaApi = {
  kind: 'tv',
  lista: '/series',
  item: '/series',
  nome: { singular: 'série', plural: 'séries' },
  discover: discoverSeries,
  genres: getSeriesGenres,
  detail: getSeriesDetail,
  availability: (id) => getAvailability(id, 'tv'),
}
