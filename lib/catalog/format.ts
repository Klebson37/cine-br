/** Formatação com as convenções brasileiras: vírgula decimal e hora cheia. */

export function formatRating(rating: number | null): string | null {
  if (rating === null) return null
  return `${rating.toFixed(1).replace('.', ',')} de 10`
}

/** 142 vira "2h22"; menos de uma hora fica em minutos, como as pessoas falam. */
export function formatRuntime(minutes: number | null): string | null {
  if (minutes === null || minutes <= 0) return null
  if (minutes < 60) return `${minutes} min`

  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest === 0 ? `${hours}h` : `${hours}h${String(rest).padStart(2, '0')}`
}

/** A linha de contexto do herói muda de forma conforme quantos serviços
 *  estão marcados — plural, singular e nenhum são frases diferentes. */
export function describeSelection(count: number): string {
  if (count === 0) return 'Hoje, nos streamings do Brasil'
  if (count === 1) return 'Hoje, no streaming que você assina'
  return `Hoje, nos seus ${count} streamings`
}
