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

export function FilterBar({ genres, activeGenre, activeSort }: FilterBarProps) {
  return (
    <form
      action="/"
      className="sticky top-14 z-10 flex flex-wrap gap-3 bg-neutral-950/95 py-3 backdrop-blur"
    >
      <select
        name="genre"
        defaultValue={activeGenre ?? ''}
        aria-label="Gênero"
        className="rounded-full bg-neutral-900 px-4 py-2 text-sm"
      >
        <option value="">Todos os gêneros</option>
        {genres.map((genre) => (
          <option key={genre.id} value={genre.id}>
            {genre.name}
          </option>
        ))}
      </select>

      <select
        name="sort"
        defaultValue={activeSort ?? ''}
        aria-label="Ordenar por"
        className="rounded-full bg-neutral-900 px-4 py-2 text-sm"
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <button
        type="submit"
        className="rounded-full bg-neutral-800 px-4 py-2 text-sm"
      >
        Aplicar
      </button>
    </form>
  )
}
