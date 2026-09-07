import { notFound } from 'next/navigation'
import { MarkButton } from '@/components/catalog/MarkButton'
import { DetalheMidia } from '@/components/movie/DetalheMidia'
import { FILMES } from '@/lib/catalog/media'
import { getCurrentUser, getMarks } from '@/lib/marks/queries'
import { readSelectedProviderIds } from '@/lib/preferences.server'

interface MoviePageProps {
  params: Promise<{ id: string }>
}

export default async function MoviePage({ params }: MoviePageProps) {
  const { id } = await params
  const movieId = Number.parseInt(id, 10)
  if (!Number.isInteger(movieId) || movieId <= 0) notFound()

  const [movie, selectedIds, marks, user] = await Promise.all([
    FILMES.detail(movieId),
    readSelectedProviderIds(),
    getMarks(),
    getCurrentUser(),
  ])
  if (!movie) notFound()

  return (
    <DetalheMidia
      movie={movie}
      selectedIds={selectedIds}
      voltar={{ href: FILMES.lista, rotulo: 'Voltar ao catálogo' }}
      acao={
        <MarkButton
          movieId={movie.id}
          current={marks.get(movie.id) ?? null}
          signedIn={user !== null}
          variant="detail"
        />
      }
    />
  )
}
