import { readFileSync } from 'node:fs'
import path from 'node:path'
import { decodeRatingsIndex, lookupRating, type RatingsIndex } from './format'

export const RATINGS_FILE = path.join(process.cwd(), 'data', 'imdb-ratings.bin')

/** Singleton preguiçoso: a primeira consulta paga a leitura do disco, as
 *  seguintes não. Instrumentation seria acoplamento sem ganho. */
let indice: RatingsIndex | null = null

/** O caminho é parâmetro para os testes poderem apontar para um arquivo de
 *  verdade. Em produção ninguém passa nada. */
export function loadRatingsIndex(file: string = RATINGS_FILE): RatingsIndex {
  if (indice) return indice

  let bytes: Uint8Array
  try {
    bytes = readFileSync(file)
  } catch {
    // Índice ausente é erro de configuração, no mesmo espírito da mensagem
    // do TMDB_ACCESS_TOKEN: dizer o que fazer, não só o que faltou.
    throw new Error(
      `Indice de notas do IMDb nao encontrado em ${file}. Rode "npm run build:imdb" para gera-lo.`,
    )
  }

  indice = decodeRatingsIndex(bytes)
  return indice
}

export function getImdbRating(tconst: string): number | null {
  return lookupRating(loadRatingsIndex(), tconst)
}

/** Só para os testes: descarta o índice em memória. */
export function resetRatingsIndexCache(): void {
  indice = null
}
