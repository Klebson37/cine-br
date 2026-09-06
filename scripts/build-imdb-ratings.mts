/** Gera data/imdb-ratings.bin a partir do dataset público de notas do IMDb.
 *
 *  Roda em predev e prebuild. Não faz nada se o arquivo já existe e tem
 *  menos de sete dias, para não cobrar sete megabytes a cada npm run dev.
 *
 *  Executado pelo Node com type stripping nativo (Node 22.18+), por isso o
 *  import de ../lib/imdb/format.ts leva a extensão explícita. */

import { mkdir, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { gunzipSync } from 'node:zlib'
import {
  encodeRatingsIndex,
  parseTconst,
  type RatingEntry,
} from '../lib/imdb/format.ts'

const URL_DATASET = 'https://datasets.imdbws.com/title.ratings.tsv.gz'

/** Corte de votos. Derruba ~1,5 milhão de linhas para ~150 mil, tira a
 *  memória de centenas de megabytes para menos de um, e elimina de graça o
 *  filme com nota 9,4 e doze votos que poluiria qualquer filtro. */
export const MIN_VOTES = 1000

const VALIDADE_MS = 7 * 24 * 60 * 60 * 1000
const DESTINO = path.join(process.cwd(), 'data', 'imdb-ratings.bin')

/** O TSV tem três colunas: tconst, averageRating, numVotes. Ausência é '\N'. */
export function parseTsv(tsv: string): RatingEntry[] {
  const entradas: RatingEntry[] = []
  const linhas = tsv.split('\n')

  for (let i = 1; i < linhas.length; i++) {
    const linha = linhas[i].trimEnd()
    if (linha === '') continue

    const [tconst, media, votos] = linha.split('\t')
    if (Number.parseInt(votos, 10) < MIN_VOTES) continue

    const id = parseTconst(tconst)
    if (id === null) continue

    const rating = Number.parseFloat(media)
    if (!Number.isFinite(rating)) continue

    entradas.push({ id, rating })
  }

  return entradas
}

async function estaFresco(): Promise<boolean> {
  try {
    const info = await stat(DESTINO)
    return Date.now() - info.mtimeMs < VALIDADE_MS
  } catch {
    return false
  }
}

async function main(): Promise<void> {
  if (await estaFresco()) {
    console.log('[imdb] indice atual tem menos de sete dias; nada a fazer.')
    return
  }

  console.log(`[imdb] baixando ${URL_DATASET} ...`)
  const resposta = await fetch(URL_DATASET)
  if (!resposta.ok) {
    throw new Error(`IMDb respondeu ${resposta.status} ao baixar o dataset.`)
  }

  const tsv = gunzipSync(Buffer.from(await resposta.arrayBuffer())).toString(
    'utf8',
  )
  const entradas = parseTsv(tsv)

  // Zero títulos só acontece se o formato do dataset mudar. Falhar aqui é
  // melhor que gravar um índice vazio que esvazia a home silenciosamente.
  if (entradas.length === 0) {
    throw new Error(
      'Nenhum titulo passou o corte de votos. O formato do dataset mudou?',
    )
  }

  await mkdir(path.dirname(DESTINO), { recursive: true })
  await writeFile(DESTINO, encodeRatingsIndex(entradas))
  console.log(
    `[imdb] ${entradas.length} titulos com ${MIN_VOTES}+ votos gravados em ${DESTINO}`,
  )
}

// Só executa quando chamado direto pela linha de comando; importado pelo
// teste, o módulo apenas expõe parseTsv e MIN_VOTES.
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main().catch((erro) => {
    console.error('[imdb] falha ao gerar o indice de notas:', erro)
    process.exit(1)
  })
}
