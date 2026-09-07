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

/** Iniciais para o lugar do retrato quando o TMDB não tem foto do ator.
 *  Duas letras no máximo: "Noé Hernández" vira "NH", "Cher" vira "C". */
export function initials(name: string): string {
  const partes = name.trim().split(/\s+/).filter(Boolean)
  if (partes.length === 0) return ''
  const primeira = partes[0][0]
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : ''
  return (primeira + ultima).toUpperCase()
}
