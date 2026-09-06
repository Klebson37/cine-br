interface TrailerProps {
  youtubeKey: string | null
}

export function Trailer({ youtubeKey }: TrailerProps) {
  // Sem vídeo, a seção inteira some — nada de moldura de player vazia.
  if (!youtubeKey) return null

  return (
    <section className="mt-8">
      <h2 className="mb-4 text-xl font-semibold">Trailer</h2>
      <div className="aspect-video overflow-hidden rounded-lg">
        <iframe
          title="Trailer"
          src={`https://www.youtube.com/embed/${youtubeKey}`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
          allowFullScreen
          className="h-full w-full"
        />
      </div>
    </section>
  )
}
