/** Layout do índice de notas do IMDb, em bytes:
 *
 *    [0, 4)          Uint32LE   quantidade de títulos (N)
 *    [4, 4+4N)       Int32LE    parte numérica do tconst, ordenada crescente
 *    [4+4N, 4+5N)    Uint8      nota × 10 (8,4 vira 84)
 *
 *  Ordenado, a consulta é busca binária sobre um Int32Array: sem Map, sem
 *  laço de parse na carga e sem alocar 150 mil strings. São ~750 KB para
 *  os títulos com mil votos ou mais.
 *
 *  Os inteiros são gravados em little-endian explícito e lidos pela ordem
 *  nativa da máquina. Toda plataforma onde este app roda — x86-64 e arm64 —
 *  é little-endian; um big-endian leria lixo.
 */

export interface RatingsIndex {
  ids: Int32Array
  ratings: Uint8Array
}

export interface RatingEntry {
  id: number
  rating: number
}

const CABECALHO_BYTES = 4

/** 'tt0111161' vira 111161. Qualquer outra forma devolve null. */
export function parseTconst(tconst: string): number | null {
  if (!/^tt\d+$/.test(tconst)) return null
  const id = Number.parseInt(tconst.slice(2), 10)
  return Number.isSafeInteger(id) ? id : null
}

/** Recebe as entradas já cortadas por número de votos e as ordena por id,
 *  que é o que torna a busca binária possível. */
export function encodeRatingsIndex(entries: RatingEntry[]): Uint8Array {
  const ordenadas = [...entries].sort((a, b) => a.id - b.id)
  const n = ordenadas.length
  const bytes = new Uint8Array(CABECALHO_BYTES + 5 * n)
  const view = new DataView(bytes.buffer)

  view.setUint32(0, n, true)
  for (let i = 0; i < n; i++) {
    view.setInt32(CABECALHO_BYTES + 4 * i, ordenadas[i].id, true)
    bytes[CABECALHO_BYTES + 4 * n + i] = Math.round(ordenadas[i].rating * 10)
  }
  return bytes
}

export function decodeRatingsIndex(bytes: Uint8Array): RatingsIndex {
  // Cópia para um ArrayBuffer próprio: um Buffer vindo de readFileSync pode
  // ter byteOffset qualquer, e Int32Array exige alinhamento de quatro bytes.
  const buffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer

  if (buffer.byteLength < CABECALHO_BYTES) {
    throw new Error(
      'Índice de notas corrompido: arquivo menor que o cabeçalho.',
    )
  }

  const n = new DataView(buffer).getUint32(0, true)
  const esperado = CABECALHO_BYTES + 5 * n
  if (buffer.byteLength !== esperado) {
    throw new Error(
      `Índice de notas corrompido: ${buffer.byteLength} bytes, esperados ${esperado}.`,
    )
  }

  return {
    ids: new Int32Array(buffer, CABECALHO_BYTES, n),
    ratings: new Uint8Array(buffer, CABECALHO_BYTES + 4 * n, n),
  }
}

/** Busca binária. Devolve a nota na escala de 0 a 10, ou null. */
export function lookupRating(
  index: RatingsIndex,
  tconst: string,
): number | null {
  const alvo = parseTconst(tconst)
  if (alvo === null) return null

  let inicio = 0
  let fim = index.ids.length - 1

  while (inicio <= fim) {
    const meio = (inicio + fim) >> 1
    const atual = index.ids[meio]
    if (atual === alvo) return index.ratings[meio] / 10
    if (atual < alvo) inicio = meio + 1
    else fim = meio - 1
  }
  return null
}
