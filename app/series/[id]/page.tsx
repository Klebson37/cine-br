import { notFound } from 'next/navigation'
import { DetalheMidia } from '@/components/movie/DetalheMidia'
import { SERIES } from '@/lib/catalog/media'
import { readSelectedProviderIds } from '@/lib/preferences.server'

interface SeriesDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function SeriesDetailPage({
  params,
}: SeriesDetailPageProps) {
  const { id } = await params
  const seriesId = Number.parseInt(id, 10)
  if (!Number.isInteger(seriesId) || seriesId <= 0) notFound()

  const [series, selectedIds] = await Promise.all([
    SERIES.detail(seriesId),
    readSelectedProviderIds(),
  ])
  if (!series) notFound()

  return (
    <DetalheMidia
      movie={series}
      selectedIds={selectedIds}
      voltar={{ href: SERIES.lista, rotulo: 'Voltar às séries' }}
      // "50min" sozinho, numa série, seria lido como a série inteira.
      rotuloDuracao="por episódio"
    />
  )
}
