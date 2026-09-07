import Link from 'next/link'
import { RATING_OPTIONS, type MinRating } from '@/lib/catalog/rating-filter'
import type { Genre } from '@/lib/catalog/types'

interface FilterBarProps {
  genres: Genre[]
  activeGenre?: string
  activeSort?: string
  /** Já validada: a página converte o parâmetro cru antes de passar. */
  activeRating?: MinRating | null
  /** Endereço da lista que os filtros recarregam: a home para filmes,
   *  /series para séries. */
  base?: string
}

const SORT_OPTIONS = [
  { value: '', label: 'Mais populares' },
  { value: 'vote_average.desc', label: 'Melhor avaliados' },
  { value: 'primary_release_date.desc', label: 'Mais recentes' },
  { value: 'title.asc', label: 'Título (A-Z)' },
]

/** O select cru do navegador era a única peça do site que o CSS não
 *  alcançava: vinha com o cinza e o canto do sistema, no meio de uma
 *  interface de pílulas. `appearance-none` devolve a caixa, e a seta passa a
 *  ser desenhada aqui — a mesma em qualquer navegador. */
const CAMPO =
  'peer h-10 w-full min-w-0 cursor-pointer appearance-none rounded-full border border-projecao/15 bg-projecao/[0.06] pl-10 pr-9 text-sm text-projecao backdrop-blur-md transition-colors hover:border-projecao/30 focus:border-luz/60 focus:bg-projecao/[0.11] focus:outline-none'

const CHIP =
  'inline-flex h-9 items-center gap-1 rounded-full border px-3.5 text-sm transition-colors'

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

/** Um campo: ícone à esquerda, seta à direita, select transparente no meio.
 *  O ícone acende junto com a borda quando o campo recebe o foco, para o
 *  campo ativo se identificar sem depender só da cor da linha. */
function Campo({
  icone,
  children,
}: {
  icone: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="relative min-w-0 flex-1 basis-44 sm:flex-none sm:basis-auto">
      {children}
      <span
        aria-hidden
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-nevoa transition-colors peer-hover:text-projecao/70 peer-focus:text-luz"
      >
        {icone}
      </span>
      <span
        aria-hidden
        className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-nevoa transition-colors peer-focus:text-luz"
      >
        <svg
          viewBox="0 0 24 24"
          className="size-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </span>
    </div>
  )
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
      <form action={base} className="flex flex-wrap items-center gap-2.5">
        <label className="sr-only" htmlFor="genre">
          Gênero
        </label>
        <Campo icone={<Mascaras />}>
          <select
            id="genre"
            name="genre"
            defaultValue={activeGenre ?? ''}
            className={CAMPO}
          >
            <option value="">Todos os gêneros</option>
            {genres.map((genre) => (
              <option key={genre.id} value={genre.id}>
                {genre.name}
              </option>
            ))}
          </select>
        </Campo>

        <label className="sr-only" htmlFor="sort">
          Ordenar por
        </label>
        <Campo icone={<Ordem />}>
          <select
            id="sort"
            name="sort"
            defaultValue={activeSort ?? ''}
            className={CAMPO}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Campo>

        {/* A nota saiu do formulário e virou link, mas precisa sobreviver ao
            envio dos outros filtros — daí o campo oculto. */}
        {activeRating !== null && (
          <input type="hidden" name="rating" value={activeRating} />
        )}

        {/* Dourado, não vermelho: o vermelho do cabeçalho é do "Entrar", e um
            segundo botão aceso na mesma tela desfaz os dois. */}
        <button
          type="submit"
          className="inline-flex h-10 shrink-0 items-center justify-center rounded-full border border-luz/45 bg-luz/[0.09] px-6 text-sm font-semibold text-luz transition-[background-color,border-color,box-shadow] hover:border-luz/80 hover:bg-luz/[0.16] hover:shadow-[0_0_24px_-8px_rgba(255,194,75,0.9)]"
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

/** Máscaras de teatro: o símbolo de gênero que não é uma letra. */
function Mascaras() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-[1.05rem]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 5h9v6.5A4.5 4.5 0 0 1 8.5 16 4.5 4.5 0 0 1 4 11.5z" />
      <path d="M6.5 8.7h.01M10.5 8.7h.01" />
      <path d="M6.6 12.2c.9.7 2 .7 2.9 0" />
      <path d="M15 7h5v5.5a4 4 0 0 1-4 4" />
    </svg>
  )
}

/** Três barras decrescentes: ordenação, sem depender de texto. */
function Ordem() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-[1.05rem]"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 7h14M5 12h9M5 17h5" />
    </svg>
  )
}
