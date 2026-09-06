import type { Genre } from '@/lib/catalog/types'

interface FilterBarProps {
  genres: Genre[]
  activeGenre?: string
  activeSort?: string
}

const SORT_OPTIONS = [
  { value: '', label: 'Mais populares' },
  { value: 'vote_average.desc', label: 'Melhor avaliados' },
  { value: 'primary_release_date.desc', label: 'Mais recentes' },
  { value: 'title.asc', label: 'Título (A-Z)' },
]

const FIELD =
  'rounded-sm border border-borda bg-sala px-3 py-2 text-sm text-projecao'

export function FilterBar({ genres, activeGenre, activeSort }: FilterBarProps) {
  return (
    <form action="/" className="flex flex-wrap items-center gap-3">
      <label className="sr-only" htmlFor="genre">
        Gênero
      </label>
      <select id="genre" name="genre" defaultValue={activeGenre ?? ''} className={FIELD}>
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
      <select id="sort" name="sort" defaultValue={activeSort ?? ''} className={FIELD}>
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <button
        type="submit"
        className="rounded-sm border border-borda px-4 py-2 text-sm font-medium text-projecao transition-colors hover:border-projecao/50"
      >
        Aplicar
      </button>
    </form>
  )
}
