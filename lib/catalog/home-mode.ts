export type HomeMode = 'discovery' | 'filtered'

export interface HomeParams {
  genre?: string
  sort?: string
  /** A nota mínima entra aqui mas **não** conta na decisão de modo: ela é
   *  aplicada dentro das fileiras. Se trocasse o modo, o filtro nunca
   *  apareceria no modo descoberta, que é justamente onde ele foi pedido. */
  rating?: string
}

function isPresent(value: string | undefined): boolean {
  return value !== undefined && value.trim() !== ''
}

/**
 * Decide o que a home inteira faz. Sem filtro nenhum, mostra destaque e
 * fileiras; com qualquer filtro, vira grade única. Pura de propósito —
 * é a regra mais consequente do app e precisa ser testável sozinha.
 */
export function resolveHomeMode(params: HomeParams): HomeMode {
  return isPresent(params.genre) || isPresent(params.sort)
    ? 'filtered'
    : 'discovery'
}
