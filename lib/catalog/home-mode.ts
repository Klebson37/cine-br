export type HomeMode = 'discovery' | 'filtered'

export interface HomeParams {
  genre?: string
  sort?: string
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
