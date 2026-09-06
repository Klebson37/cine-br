import Link from 'next/link'
import { EmptyState } from '@/components/catalog/EmptyState'
import { MovieCard } from '@/components/catalog/MovieCard'
import { getAvailability, searchMovies } from '@/lib/catalog/queries'
import { classifyAvailability } from '@/lib/catalog/search-availability'
import { readSelectedProviderIds } from '@/lib/preferences.server'

interface SearchPageProps {
  searchParams: Promise<{ q?: string; only?: string }>
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q, only } = await searchParams
  const query = q?.trim() ?? ''

  if (query === '') {
    return (
      <div className="wrap pt-12">
        <EmptyState
          title="Procure um filme pelo nome."
          hint="Use o campo no topo da página. Os resultados mostram, um por um, se o filme já está incluído no que você assina."
          actionLabel="Voltar ao catálogo"
        />
      </div>
    )
  }

  const [movies, selectedIds] = await Promise.all([
    searchMovies(query),
    readSelectedProviderIds(),
  ])

  // /search/movie não filtra por provedor, então a disponibilidade é
  // resolvida aqui, uma requisição por filme, em paralelo e com cache.
  const labeled = await Promise.all(
    movies.map(async (movie) => ({
      movie,
      label: classifyAvailability(
        await getAvailability(movie.id).catch(() => ({
          flatrate: [],
          rent: [],
          buy: [],
        })),
        selectedIds,
      ),
    })),
  )

  // Sem nenhum serviço marcado, filtrar "só os meus" esvaziaria a busca
  // sempre. O botão dá lugar ao convite para escolher os serviços.
  const temServicos = selectedIds.length > 0
  const onlyMine = only === '1' && temServicos
  const visible = onlyMine
    ? labeled.filter((item) => item.label === 'subscription')
    : labeled
  const incluidos = labeled.filter(
    (item) => item.label === 'subscription',
  ).length

  return (
    <div className="wrap pt-12">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
        <div>
          <h1 className="panoramico max-w-[20ch] text-[clamp(1.5rem,3.5vw,2.5rem)] font-bold leading-tight text-projecao">
            {query}
          </h1>
          <p className="mt-3 text-sm text-nevoa">
            {labeled.length} resultado{labeled.length === 1 ? '' : 's'}
            {incluidos > 0 && (
              <>
                {', '}
                <span className="text-luz">
                  {incluidos} já incluído{incluidos === 1 ? '' : 's'} no que
                  você assina
                </span>
              </>
            )}
          </p>
        </div>

        {temServicos ? (
          <Link
            href={`/search?q=${encodeURIComponent(query)}${onlyMine ? '' : '&only=1'}`}
            className={`rounded-sm border px-4 py-2.5 text-sm font-medium transition-colors ${
              onlyMine
                ? 'border-luz/70 bg-luz/10 text-luz'
                : 'border-borda text-projecao hover:border-projecao/50'
            }`}
          >
            {onlyMine ? 'Mostrar todos' : 'Somente nos meus streamings'}
          </Link>
        ) : (
          <Link
            href="/?providers=open"
            className="rounded-sm border border-borda px-4 py-2.5 text-sm font-medium text-projecao transition-colors hover:border-projecao/50"
          >
            Escolher meus streamings
          </Link>
        )}
      </div>

      <div className="mt-10">
        {visible.length === 0 ? (
          <EmptyState
            title="Nada encontrado."
            hint={
              onlyMine
                ? 'Nenhum desses resultados está nos streamings que você assina. Mostre todos para ver onde eles estão.'
                : 'Confira a grafia do título ou tente o nome original.'
            }
            actionLabel={onlyMine ? 'Mostrar todos' : 'Voltar ao catálogo'}
            actionHref={
              onlyMine ? `/search?q=${encodeURIComponent(query)}` : '/'
            }
          />
        ) : (
          <div className="grid grid-cols-3 gap-x-3 gap-y-8 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8">
            {visible.map(({ movie, label }) => (
              <MovieCard key={movie.id} movie={movie} availability={label} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
