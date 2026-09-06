interface TrailerProps {
  youtubeKey: string | null
}

export function Trailer({ youtubeKey }: TrailerProps) {
  // Sem vídeo, a seção inteira some — nada de moldura de player vazia.
  if (!youtubeKey) return null

  return (
    <section>
      <h2 className="titulo-secao text-lg text-projecao">Trailer</h2>
      <div className="mt-4 aspect-video overflow-hidden rounded-sm border border-borda bg-sala">
        <iframe
          title="Trailer"
          src={`https://www.youtube-nocookie.com/embed/${youtubeKey}`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
          allowFullScreen
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          className="h-full w-full"
        />
      </div>
    </section>
  )
}
