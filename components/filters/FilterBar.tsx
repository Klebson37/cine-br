import Link from 'next/link'
import { RATING_OPTIONS, type MinRating } from '@/lib/catalog/rating-filter'
import type { Genre } from '@/lib/catalog/types'

interface FilterBarProps {
  genres: Genre[]
  activeGenre?: string
  activeSort?: string
  /** Já validada: a página converte o parâmetro cru antes de passar. */
  activeRating?: MinRating | null
  /** Endereco da lista que os filtros recarregam: a home para filmes,
   *  /series para series. */
  base?: string
}

const SORT_OPTIONS = [
  { value: '', label: 'Mais populares' },
  { value: 'vote_average.desc', label: 'Melhor avaliados' },
  { value: 'primary_release_date.desc', label: 'Mais recentes' },
  { value: 'title.asc', label: 'Título (A-Z)' },
]

const FIELD =
  'min-w-0 flex-1 basis-40 rounded-sm border border-borda bg-sala px-3 py-2 text-sm text-projecao sm:flex-none sm:basis-auto'

const CHIP =
  'inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm transition-colors'

/** Monta o endereço da faixa de nota preservando os outros filtros: trocar
 *  a nota não pode apagar o gênero que a pessoa já escolheu. */
function ratingHref(
  base: string,
  rating: MinRating | null,
  genre?: string,
  sort?: string,
): string {
  const params = new URLSearchParams()
  if (genre) params.set('genre', genre)
  if (sort) params.set('sort', sort)
  if (rating !== null) params.set('rating', String(rating))
  const query = params.toString()
  return query === '' ? base : `${base}?${query}`
}

export function FilterBar({
  genres,
  activeGenre,
  activeSort,
  activeRating = null,
  base = '/',
}: FilterBarProps) {
  const faixas: { value: MinRating | null; label: string }[] = [
    { value: null, label: 'Todos' },
    ...RATING_OPTIONS.map((nota) => ({ value: nota, label: `${nota}+` })),
  ]

  return (
    <div className="flex flex-col gap-4">
      <form action={base} className="flex flex-wrap items-center gap-3">
        <label className="sr-only" htmlFor="genre">
          Gênero
        </label>
        <select
          id="genre"
          name="genre"
          defaultValue={activeGenre ?? ''}
          className={FIELD}
        >
          <option value="">Todos os gêneros</option>
          {genres.map((genre) => (
            <option key={genre.id} value={genre.id}>
              {genre.name}
            </option>
          ))}
        </select>

        <label className="sr-only" htmlFor="sort">
          Ordenar por
        </label>
        <select
          id="sort"
          name="sort"
          defaultValue={activeSort ?? ''}
          className={FIELD}
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {/* A nota saiu do formulário e virou link, mas precisa sobreviver ao
            envio dos outros filtros — daí o campo oculto. */}
        {activeRating !== null && (
          <input type="hidden" name="rating" value={activeRating} />
        )}

        <button
          type="submit"
          className="shrink-0 rounded-sm border border-borda px-4 py-2 text-sm font-medium text-projecao transition-colors hover:border-projecao/50"
        >
          Aplicar
        </button>
      </form>

      {/* Links, não botões de formulário: um clique só, e sem JavaScript.
          O rótulo fica em linha própria no celular: em linha com as faixas
          ele empurrava as cinco para uma quebra torta de três mais duas,
          quando as cinco cabem folgadas numa fila só. */}
      <nav
        aria-label="Filtrar por nota"
        className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center"
      >
        <span className="text-xs uppercase tracking-wider text-nevoa sm:mr-1">
          Filtrar por nota
        </span>
        <div className="flex flex-wrap gap-2">
          {faixas.map((faixa) => {
            const ativa = faixa.value === activeRating
            return (
              <Link
                key={faixa.label}
                href={ratingHref(base, faixa.value, activeGenre, activeSort)}
                aria-current={ativa ? 'page' : undefined}
                className={`${CHIP} ${
                  ativa
                    ? 'border-cortina bg-cortina/10 text-cortina'
                    : 'border-borda text-nevoa hover:border-cortina/60 hover:text-projecao'
                }`}
              >
                {faixa.value !== null && (
                  <span aria-hidden className="text-luz">
                    ★
                  </span>
                )}
                {faixa.label}
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
