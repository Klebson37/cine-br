# Filtro por nota do IMDb — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar um filtro de nota mínima do IMDb na home do CineBR, valendo tanto nas fileiras do modo descoberta quanto na grade do modo filtrado.

**Architecture:** As notas vêm do dataset público do IMDb, compactado em build para um arquivo binário de ~750 KB que o servidor lê uma vez e consulta por busca binária. O `/discover` do TMDB recebe um pré-filtro de `vote_average` meio ponto abaixo do limite pedido, o que derruba a maioria dos candidatos de graça; só os sobreviventes, deduplicados entre as cinco fileiras, pagam uma chamada a `/movie/{id}/external_ids` para resolver o `imdb_id`. Filme sem nota sai da lista.

**Tech Stack:** Next.js 16.3.4 (App Router, Server Components), React 19.2.8, TypeScript 5, Tailwind CSS 4, Vitest 5 (jsdom), Playwright 1.63, Node 24 (type stripping nativo).

**Spec:** [`docs/superpowers/specs/2026-09-06-filtro-nota-imdb-design.md`](../specs/2026-09-06-filtro-nota-imdb-design.md)

## Global Constraints

- **Idioma:** todo texto de interface, comentário de código e mensagem de commit em português do Brasil. Mensagens de commit **sem acentos**, seguindo o histórico do repositório (`feat: adiciona pagina de detalhe...`).
- **Comparação do filtro:** `imdbRating >= limite`. Um filme com exatamente 8,0 entra em "Nota 8 ou mais".
- **Valores aceitos de nota:** somente `6`, `7`, `8`, `9`. Qualquer outra entrada vira "sem filtro".
- **Folga do pré-filtro:** `0.5` fixo. Nota 8 pedida → `vote_average.gte=7.5` ao TMDB.
- **Piso de votos do TMDB:** `vote_count.gte=200` sempre que houver filtro de nota.
- **Corte de votos do dataset IMDb:** `numVotes >= 1000`.
- **Concorrência das chamadas de `imdb_id`:** máximo de `8` simultâneas.
- **Filme sem nota do IMDb sai da lista.** Nunca entra "por precaução".
- **Ordem nunca é reordenada** pelo filtro: ela é a classificação por popularidade.
- **O formulário de filtros continua sendo um GET puro, sem JavaScript.**
- **`lib/catalog/queries.ts` fala só TMDB.** A composição TMDB + IMDb mora em `lib/catalog/rated-discovery.ts`.
- **Nada de dependência nova no `package.json`.** `zlib` e `fetch` são embutidos no Node.
- Rodar `npm test` (Vitest) e `npm run lint` antes de cada commit.

---

## Estrutura de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `lib/imdb/format.ts` *(novo)* | Layout de bytes do índice: codificar, decodificar, converter `tconst`, busca binária. Puro, sem I/O |
| `lib/imdb/ratings.ts` *(novo)* | Ler o arquivo do disco uma vez e expor `getImdbRating(tconst)` |
| `lib/concurrency.ts` *(novo)* | `mapWithConcurrency`, utilitário genérico sem nada de catálogo |
| `scripts/build-imdb-ratings.ts` *(novo)* | Baixar o dataset, cortar por votos, gravar `data/imdb-ratings.bin` |
| `lib/catalog/rating-filter.ts` *(novo)* | Regras puras: valores aceitos, folga do pré-filtro, quem passa no limite |
| `lib/catalog/rated-discovery.ts` *(novo)* | Compor TMDB + IMDb: deduplicar, resolver notas, filtrar fileiras |
| `lib/catalog/queries.ts` *(alterar)* | `DiscoverOptions` ganha o pré-filtro; novo `getImdbId` |
| `lib/tmdb/schema.ts` *(alterar)* | `RawExternalIds` |
| `lib/catalog/home-mode.ts` *(alterar)* | `rating` entra em `HomeParams` **sem** trocar o modo |
| `lib/catalog/rails.ts` *(alterar)* | Título da fileira de populares perde o "10" quando há filtro |
| `components/filters/FilterBar.tsx` *(alterar)* | Terceiro `<select>` |
| `app/page.tsx` *(alterar)* | Ligar tudo |
| `next.config.ts` *(alterar)* | `outputFileTracingIncludes` para `data/` |
| `tsconfig.json` *(alterar)* | `allowImportingTsExtensions` |
| `package.json` *(alterar)* | `build:imdb`, `predev`, `prebuild`, `engines` |
| `.gitignore` *(alterar)* | `data/` |
| `e2e/catalog.spec.ts` *(alterar)* | Caso de ponta a ponta do filtro |

---

### Task 1: Layout binário do índice de notas

**Files:**
- Create: `lib/imdb/format.ts`
- Test: `lib/imdb/format.test.ts`

**Interfaces:**
- Consumes: nada
- Produces: `RatingsIndex { ids: Int32Array; ratings: Uint8Array }`, `RatingEntry { id: number; rating: number }`, `parseTconst(tconst: string): number | null`, `encodeRatingsIndex(entries: RatingEntry[]): Uint8Array`, `decodeRatingsIndex(bytes: Uint8Array): RatingsIndex`, `lookupRating(index: RatingsIndex, tconst: string): number | null`

- [ ] **Step 1: Escrever o teste que falha**

Criar `lib/imdb/format.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  decodeRatingsIndex,
  encodeRatingsIndex,
  lookupRating,
  parseTconst,
} from './format'

const ENTRADAS = [
  { id: 111161, rating: 9.3 },
  { id: 68646, rating: 9.2 },
  { id: 468569, rating: 9.0 },
  { id: 137523, rating: 8.8 },
  { id: 3896198, rating: 6.8 },
]

function indice() {
  return decodeRatingsIndex(encodeRatingsIndex(ENTRADAS))
}

describe('parseTconst', () => {
  it('converte a forma canônica', () => {
    expect(parseTconst('tt0111161')).toBe(111161)
  })

  it('aceita tconst sem zeros à esquerda', () => {
    expect(parseTconst('tt3896198')).toBe(3896198)
  })

  it('devolve null para qualquer outra forma', () => {
    expect(parseTconst('nm0000138')).toBeNull()
    expect(parseTconst('tt')).toBeNull()
    expect(parseTconst('0111161')).toBeNull()
    expect(parseTconst('tt01a1161')).toBeNull()
    expect(parseTconst('')).toBeNull()
  })
})

describe('encodeRatingsIndex e decodeRatingsIndex', () => {
  it('grava 4 + 5N bytes', () => {
    expect(encodeRatingsIndex(ENTRADAS).byteLength).toBe(4 + 5 * 5)
  })

  it('ordena os ids em ordem crescente, qualquer que seja a entrada', () => {
    const { ids } = indice()
    expect([...ids]).toEqual([68646, 111161, 137523, 468569, 3896198])
  })

  it('mantém cada nota junto do seu id depois da ordenação', () => {
    const { ids, ratings } = indice()
    const posicao = ids.indexOf(111161)
    expect(ratings[posicao] / 10).toBeCloseTo(9.3)
  })

  it('aceita índice vazio', () => {
    const { ids } = decodeRatingsIndex(encodeRatingsIndex([]))
    expect(ids.length).toBe(0)
  })

  it('recusa um arquivo com tamanho incompatível com o cabeçalho', () => {
    const bytes = encodeRatingsIndex(ENTRADAS)
    expect(() => decodeRatingsIndex(bytes.slice(0, 12))).toThrow(/corrompido/i)
  })

  it('decodifica mesmo com byteOffset diferente de zero', () => {
    // readFileSync devolve Buffer, que pode vir de um pool com deslocamento.
    const original = encodeRatingsIndex(ENTRADAS)
    const maior = new Uint8Array(3 + original.byteLength)
    maior.set(original, 3)
    const deslocado = maior.subarray(3)
    expect(lookupRating(decodeRatingsIndex(deslocado), 'tt0111161')).toBeCloseTo(9.3)
  })
})

describe('lookupRating', () => {
  it('acha o primeiro elemento', () => {
    expect(lookupRating(indice(), 'tt0068646')).toBeCloseTo(9.2)
  })

  it('acha o último elemento', () => {
    expect(lookupRating(indice(), 'tt3896198')).toBeCloseTo(6.8)
  })

  it('acha um elemento do meio', () => {
    expect(lookupRating(indice(), 'tt0137523')).toBeCloseTo(8.8)
  })

  it('devolve null para tconst ausente do índice', () => {
    expect(lookupRating(indice(), 'tt9999999')).toBeNull()
  })

  it('devolve null para tconst malformado, sem varrer o índice', () => {
    expect(lookupRating(indice(), 'lixo')).toBeNull()
  })

  it('devolve null em índice vazio', () => {
    const vazio = decodeRatingsIndex(encodeRatingsIndex([]))
    expect(lookupRating(vazio, 'tt0111161')).toBeNull()
  })
})
```

- [ ] **Step 2: Rodar o teste e conferir que falha**

Run: `npm test -- lib/imdb/format.test.ts`
Expected: FAIL — `Failed to resolve import "./format"`

- [ ] **Step 3: Implementar**

Criar `lib/imdb/format.ts`:

```ts
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
    throw new Error('Índice de notas corrompido: arquivo menor que o cabeçalho.')
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
```

- [ ] **Step 4: Rodar o teste e conferir que passa**

Run: `npm test -- lib/imdb/format.test.ts`
Expected: PASS, 16 testes

- [ ] **Step 5: Commit**

```bash
git add lib/imdb/format.ts lib/imdb/format.test.ts
git commit -m "feat: adiciona formato binario do indice de notas do imdb"
```

---

### Task 2: Utilitário de concorrência limitada

**Files:**
- Create: `lib/concurrency.ts`
- Test: `lib/concurrency.test.ts`

**Interfaces:**
- Consumes: nada
- Produces: `mapWithConcurrency<T, R>(items: readonly T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]>`

- [ ] **Step 1: Escrever o teste que falha**

Criar `lib/concurrency.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { mapWithConcurrency } from './concurrency'

function adiado<T>(valor: T, ms: number): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(valor), ms))
}

describe('mapWithConcurrency', () => {
  it('preserva a ordem do resultado mesmo com durações embaralhadas', async () => {
    const resultado = await mapWithConcurrency([30, 10, 20], 3, (ms) =>
      adiado(ms, ms),
    )
    expect(resultado).toEqual([30, 10, 20])
  })

  it('nunca passa do limite de promessas vivas', async () => {
    let vivas = 0
    let pico = 0

    await mapWithConcurrency(
      Array.from({ length: 20 }, (_, i) => i),
      4,
      async (i) => {
        vivas++
        pico = Math.max(pico, vivas)
        await adiado(i, 1)
        vivas--
        return i
      },
    )

    expect(pico).toBe(4)
  })

  it('processa todos os itens quando há mais itens que o limite', async () => {
    const resultado = await mapWithConcurrency(
      Array.from({ length: 25 }, (_, i) => i),
      8,
      async (i) => i * 2,
    )
    expect(resultado).toHaveLength(25)
    expect(resultado[24]).toBe(48)
  })

  it('repassa o índice para a função', async () => {
    const resultado = await mapWithConcurrency(['a', 'b'], 2, async (item, i) =>
      `${i}:${item}`,
    )
    expect(resultado).toEqual(['0:a', '1:b'])
  })

  it('devolve lista vazia sem chamar a função', async () => {
    let chamadas = 0
    const resultado = await mapWithConcurrency([], 8, async () => chamadas++)
    expect(resultado).toEqual([])
    expect(chamadas).toBe(0)
  })

  it('não cria mais trabalhadores que itens', async () => {
    const resultado = await mapWithConcurrency([1], 8, async (n) => n + 1)
    expect(resultado).toEqual([2])
  })
})
```

- [ ] **Step 2: Rodar o teste e conferir que falha**

Run: `npm test -- lib/concurrency.test.ts`
Expected: FAIL — `Failed to resolve import "./concurrency"`

- [ ] **Step 3: Implementar**

Criar `lib/concurrency.ts`:

```ts
/** Executa `fn` sobre `items` com no máximo `limit` promessas vivas ao mesmo
 *  tempo, preservando a ordem do resultado.
 *
 *  Existe porque resolver o imdb_id de umas quarenta chamadas de uma vez
 *  convida o 429 do TMDB, e serializar tudo deixaria a home fria lenta
 *  sem necessidade. */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const resultados = new Array<R>(items.length)
  let proximo = 0

  async function trabalhador(): Promise<void> {
    for (;;) {
      const indice = proximo++
      if (indice >= items.length) return
      resultados[indice] = await fn(items[indice], indice)
    }
  }

  const quantos = Math.min(Math.max(limit, 1), items.length)
  await Promise.all(Array.from({ length: quantos }, () => trabalhador()))

  return resultados
}
```

- [ ] **Step 4: Rodar o teste e conferir que passa**

Run: `npm test -- lib/concurrency.test.ts`
Expected: PASS, 6 testes

- [ ] **Step 5: Commit**

```bash
git add lib/concurrency.ts lib/concurrency.test.ts
git commit -m "feat: adiciona utilitario de concorrencia limitada"
```

---

### Task 3: Script de build do índice de notas

**Files:**
- Create: `scripts/build-imdb-ratings.ts`
- Test: `scripts/build-imdb-ratings.test.ts`
- Modify: `tsconfig.json`, `package.json`, `.gitignore`, `next.config.ts`

**Interfaces:**
- Consumes: `encodeRatingsIndex`, `parseTconst`, `RatingEntry` da Task 1
- Produces: `parseTsv(tsv: string): RatingEntry[]`, `MIN_VOTES = 1000`, e o arquivo `data/imdb-ratings.bin`

- [ ] **Step 1: Liberar a importação com extensão .ts no tsconfig**

O script importa `../lib/imdb/format.ts` com extensão explícita, que é o que o type stripping nativo do Node exige. Sem esta opção o `tsc` reclama. É segura porque `noEmit` já está ligado.

Em `tsconfig.json`, dentro de `compilerOptions`, logo depois de `"isolatedModules": true,`:

```json
    "allowImportingTsExtensions": true,
```

- [ ] **Step 2: Escrever o teste que falha**

Criar `scripts/build-imdb-ratings.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { MIN_VOTES, parseTsv } from './build-imdb-ratings.ts'

const CABECALHO = 'tconst\taverageRating\tnumVotes'

function tsv(...linhas: string[]): string {
  return [CABECALHO, ...linhas].join('\n')
}

describe('parseTsv', () => {
  it('ignora a linha de cabeçalho', () => {
    expect(parseTsv(tsv())).toEqual([])
  })

  it('converte tconst e nota das linhas que passam o corte', () => {
    const entradas = parseTsv(tsv('tt0111161\t9.3\t2900000'))
    expect(entradas).toEqual([{ id: 111161, rating: 9.3 }])
  })

  it('descarta títulos abaixo do corte de votos', () => {
    const entradas = parseTsv(
      tsv('tt0111161\t9.3\t2900000', `tt9999999\t9.9\t${MIN_VOTES - 1}`),
    )
    expect(entradas).toEqual([{ id: 111161, rating: 9.3 }])
  })

  it('mantém o título que empata exatamente com o corte', () => {
    const entradas = parseTsv(tsv(`tt0111161\t9.3\t${MIN_VOTES}`))
    expect(entradas).toHaveLength(1)
  })

  it('descarta linhas com tconst malformado', () => {
    expect(parseTsv(tsv('nm0000138\t9.3\t2900000'))).toEqual([])
  })

  it('descarta linhas com nota não numérica', () => {
    expect(parseTsv(tsv('tt0111161\t\\N\t2900000'))).toEqual([])
  })

  it('tolera linha vazia no fim do arquivo', () => {
    const entradas = parseTsv(`${tsv('tt0111161\t9.3\t2900000')}\n`)
    expect(entradas).toHaveLength(1)
  })

  it('tolera terminação de linha do Windows', () => {
    const entradas = parseTsv(
      `${CABECALHO}\r\ntt0111161\t9.3\t2900000\r\n`,
    )
    expect(entradas).toEqual([{ id: 111161, rating: 9.3 }])
  })
})
```

- [ ] **Step 3: Rodar o teste e conferir que falha**

Run: `npm test -- scripts/build-imdb-ratings.test.ts`
Expected: FAIL — `Failed to resolve import "./build-imdb-ratings.ts"`

- [ ] **Step 4: Implementar o script**

Criar `scripts/build-imdb-ratings.ts`:

```ts
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
```

- [ ] **Step 5: Rodar o teste e conferir que passa**

Run: `npm test -- scripts/build-imdb-ratings.test.ts`
Expected: PASS, 8 testes

- [ ] **Step 6: Ligar o script ao ciclo de vida do projeto**

Em `package.json`, substituir o bloco `"scripts"` por:

```json
  "scripts": {
    "build:imdb": "node scripts/build-imdb-ratings.ts",
    "predev": "npm run build:imdb",
    "dev": "next dev",
    "prebuild": "npm run build:imdb",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test"
  },
```

E acrescentar, logo depois de `"private": true,`:

```json
  "engines": {
    "node": ">=22.18.0"
  },
```

O piso de versão não é decorativo: o script depende do type stripping nativo, que só é ligado por padrão a partir do Node 22.18.

- [ ] **Step 7: Manter o índice fora do Git**

Em `.gitignore`, logo depois do bloco `# Build do Next.js`, acrescentar:

```
# Indice de notas do IMDb — gerado por scripts/build-imdb-ratings.ts no build
data/
```

- [ ] **Step 8: Incluir o índice no bundle serverless**

Sem isto o arquivo existe em desenvolvimento e **some em produção**: o rastreamento de arquivos do Next só inclui o que consegue seguir por `import`, e um `readFileSync` de caminho montado em tempo de execução não é rastreável.

Substituir `next.config.ts` inteiro por:

```ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'image.tmdb.org', pathname: '/t/p/**' },
    ],
  },
  // O índice de notas é lido com readFileSync, que o rastreador de arquivos
  // não consegue seguir. Sem isto o arquivo não entra no bundle serverless e
  // o filtro de nota quebra só em produção.
  outputFileTracingIncludes: {
    '/': ['./data/**/*'],
    '/*': ['./data/**/*'],
  },
}

export default nextConfig
```

- [ ] **Step 9: Gerar o índice de verdade e conferir**

Run: `npm run build:imdb`
Expected: imprime algo como `[imdb] 150000+ titulos com 1000+ votos gravados em ...`

Run: `node -e "const {statSync}=require('fs');const s=statSync('data/imdb-ratings.bin');console.log(s.size,'bytes',(s.size-4)/5,'titulos')"`
Expected: tamanho na casa de centenas de KB e um número **inteiro** de títulos — se não for inteiro, o layout está errado.

Run de novo: `npm run build:imdb`
Expected: `[imdb] indice atual tem menos de sete dias; nada a fazer.`

Run: `git status --short data/`
Expected: nenhuma saída — o `.gitignore` está pegando.

- [ ] **Step 10: Rodar a suíte inteira e o lint**

Run: `npm test`
Expected: PASS, incluindo os testes já existentes do repositório

Run: `npm run lint`
Expected: sem erros

- [ ] **Step 11: Commit**

```bash
git add scripts/build-imdb-ratings.ts scripts/build-imdb-ratings.test.ts tsconfig.json package.json .gitignore next.config.ts
git commit -m "feat: adiciona script que gera o indice de notas do imdb"
```

---

### Task 4: Leitura do índice em memória

**Files:**
- Create: `lib/imdb/ratings.ts`
- Test: `lib/imdb/ratings.test.ts`

**Interfaces:**
- Consumes: `decodeRatingsIndex`, `lookupRating`, `RatingsIndex` da Task 1
- Produces: `RATINGS_FILE: string`, `loadRatingsIndex(): RatingsIndex`, `getImdbRating(tconst: string): number | null`, `resetRatingsIndexCache(): void`

- [ ] **Step 1: Escrever o teste que falha**

Criar `lib/imdb/ratings.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const readFileSync = vi.hoisted(() => vi.fn())

vi.mock('node:fs', () => ({ readFileSync }))

import { encodeRatingsIndex } from './format'
import { getImdbRating, resetRatingsIndexCache } from './ratings'

const BYTES = encodeRatingsIndex([
  { id: 111161, rating: 9.3 },
  { id: 68646, rating: 9.2 },
])

describe('getImdbRating', () => {
  beforeEach(() => {
    resetRatingsIndexCache()
    readFileSync.mockReturnValue(BYTES)
  })

  afterEach(() => vi.clearAllMocks())

  it('devolve a nota do título presente no índice', () => {
    expect(getImdbRating('tt0111161')).toBeCloseTo(9.3)
  })

  it('devolve null para título ausente', () => {
    expect(getImdbRating('tt9999999')).toBeNull()
  })

  it('lê o arquivo uma única vez, por mais consultas que venham', () => {
    getImdbRating('tt0111161')
    getImdbRating('tt0068646')
    getImdbRating('tt9999999')
    expect(readFileSync).toHaveBeenCalledTimes(1)
  })

  it('explica como gerar o índice quando o arquivo não existe', () => {
    resetRatingsIndexCache()
    readFileSync.mockImplementation(() => {
      throw new Error('ENOENT')
    })
    expect(() => getImdbRating('tt0111161')).toThrow(/build:imdb/)
  })

  it('não guarda em cache uma leitura que falhou', () => {
    resetRatingsIndexCache()
    readFileSync.mockImplementationOnce(() => {
      throw new Error('ENOENT')
    })
    expect(() => getImdbRating('tt0111161')).toThrow()

    readFileSync.mockReturnValue(BYTES)
    expect(getImdbRating('tt0111161')).toBeCloseTo(9.3)
  })
})
```

- [ ] **Step 2: Rodar o teste e conferir que falha**

Run: `npm test -- lib/imdb/ratings.test.ts`
Expected: FAIL — `Failed to resolve import "./ratings"`

- [ ] **Step 3: Implementar**

Criar `lib/imdb/ratings.ts`:

```ts
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { decodeRatingsIndex, lookupRating, type RatingsIndex } from './format'

export const RATINGS_FILE = path.join(process.cwd(), 'data', 'imdb-ratings.bin')

/** Singleton preguiçoso: a primeira consulta paga a leitura do disco, as
 *  seguintes não. Instrumentation seria acoplamento sem ganho. */
let indice: RatingsIndex | null = null

export function loadRatingsIndex(): RatingsIndex {
  if (indice) return indice

  let bytes: Uint8Array
  try {
    bytes = readFileSync(RATINGS_FILE)
  } catch {
    // Índice ausente é erro de configuração, no mesmo espírito da mensagem
    // do TMDB_ACCESS_TOKEN: dizer o que fazer, não só o que faltou.
    throw new Error(
      `Indice de notas do IMDb nao encontrado em ${RATINGS_FILE}. Rode "npm run build:imdb" para gera-lo.`,
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
```

- [ ] **Step 4: Rodar o teste e conferir que passa**

Run: `npm test -- lib/imdb/ratings.test.ts`
Expected: PASS, 5 testes

- [ ] **Step 5: Commit**

```bash
git add lib/imdb/ratings.ts lib/imdb/ratings.test.ts
git commit -m "feat: adiciona leitura em memoria do indice de notas"
```

---

### Task 5: Regras puras do filtro de nota

**Files:**
- Create: `lib/catalog/rating-filter.ts`
- Test: `lib/catalog/rating-filter.test.ts`

**Interfaces:**
- Consumes: `Movie` de `lib/catalog/types.ts`
- Produces: `RATING_OPTIONS: readonly [6, 7, 8, 9]`, `MinRating = 6 | 7 | 8 | 9`, `PREFILTER_SLACK = 0.5`, `MIN_VOTE_COUNT = 200`, `parseMinRating(raw: string | undefined): MinRating | null`, `prefilterVoteAverage(min: MinRating): number`, `passesMinRating(imdbRating: number | null, min: MinRating): boolean`, `filterByImdbRating(movies: readonly Movie[], ratings: ReadonlyMap<number, number | null>, min: MinRating): Movie[]`

- [ ] **Step 1: Escrever o teste que falha**

Criar `lib/catalog/rating-filter.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  MIN_VOTE_COUNT,
  filterByImdbRating,
  parseMinRating,
  passesMinRating,
  prefilterVoteAverage,
} from './rating-filter'
import type { Movie } from './types'

function movie(id: number): Movie {
  return {
    id,
    title: `Filme ${id}`,
    year: 1999,
    overview: '',
    posterUrl: '/p.jpg',
    backdropUrl: null,
    rating: 8,
    runtimeMinutes: null,
  }
}

describe('parseMinRating', () => {
  it('aceita os quatro valores oferecidos pela interface', () => {
    expect(parseMinRating('6')).toBe(6)
    expect(parseMinRating('7')).toBe(7)
    expect(parseMinRating('8')).toBe(8)
    expect(parseMinRating('9')).toBe(9)
  })

  it('devolve null quando o parâmetro não veio', () => {
    expect(parseMinRating(undefined)).toBeNull()
    expect(parseMinRating('')).toBeNull()
  })

  it('ignora espaços em volta', () => {
    expect(parseMinRating(' 8 ')).toBe(8)
  })

  it('recusa valores fora da lista, inclusive plausíveis', () => {
    expect(parseMinRating('5')).toBeNull()
    expect(parseMinRating('10')).toBeNull()
    expect(parseMinRating('8.5')).toBeNull()
    expect(parseMinRating('-1')).toBeNull()
    expect(parseMinRating('99')).toBeNull()
    expect(parseMinRating('abc')).toBeNull()
  })
})

describe('prefilterVoteAverage', () => {
  it('desce meio ponto do limite pedido', () => {
    expect(prefilterVoteAverage(8)).toBe(7.5)
    expect(prefilterVoteAverage(6)).toBe(5.5)
    expect(prefilterVoteAverage(9)).toBe(8.5)
  })
})

describe('MIN_VOTE_COUNT', () => {
  it('mantém o piso de votos do TMDB em 200', () => {
    expect(MIN_VOTE_COUNT).toBe(200)
  })
})

describe('passesMinRating', () => {
  it('aceita nota exatamente igual ao limite', () => {
    expect(passesMinRating(8, 8)).toBe(true)
  })

  it('aceita nota acima do limite', () => {
    expect(passesMinRating(8.1, 8)).toBe(true)
  })

  it('recusa nota abaixo do limite', () => {
    expect(passesMinRating(7.9, 8)).toBe(false)
  })

  it('recusa ausência de nota: ausência não satisfaz um limite', () => {
    expect(passesMinRating(null, 8)).toBe(false)
  })
})

describe('filterByImdbRating', () => {
  it('mantém só os filmes que passam o limite', () => {
    const ratings = new Map([
      [1, 8.4],
      [2, 6.1],
      [3, 9.0],
    ])
    const resultado = filterByImdbRating(
      [movie(1), movie(2), movie(3)],
      ratings,
      8,
    )
    expect(resultado.map((m) => m.id)).toEqual([1, 3])
  })

  it('preserva a ordem original, que é a classificação por popularidade', () => {
    const ratings = new Map([
      [3, 8.1],
      [1, 9.5],
      [2, 8.8],
    ])
    const resultado = filterByImdbRating(
      [movie(3), movie(1), movie(2)],
      ratings,
      8,
    )
    expect(resultado.map((m) => m.id)).toEqual([3, 1, 2])
  })

  it('descarta filme ausente do mapa de notas', () => {
    const resultado = filterByImdbRating([movie(1)], new Map(), 8)
    expect(resultado).toEqual([])
  })

  it('descarta filme cuja nota veio null', () => {
    const resultado = filterByImdbRating([movie(1)], new Map([[1, null]]), 8)
    expect(resultado).toEqual([])
  })

  it('devolve lista vazia para entrada vazia', () => {
    expect(filterByImdbRating([], new Map(), 8)).toEqual([])
  })
})
```

- [ ] **Step 2: Rodar o teste e conferir que falha**

Run: `npm test -- lib/catalog/rating-filter.test.ts`
Expected: FAIL — `Failed to resolve import "./rating-filter"`

- [ ] **Step 3: Implementar**

Criar `lib/catalog/rating-filter.ts`:

```ts
import type { Movie } from './types'

/** Os valores oferecidos na barra de filtros. */
export const RATING_OPTIONS = [6, 7, 8, 9] as const
export type MinRating = (typeof RATING_OPTIONS)[number]

/** Folga do pré-filtro do TMDB. As duas notas correlacionam forte e o TMDB
 *  costuma ser a mais generosa das duas, então descer meio ponto antes de
 *  verificar no IMDb é conservador. Fixo de propósito: calibrar por gênero
 *  ou década é sintonia fina cara e impossível de provar melhor. */
export const PREFILTER_SLACK = 0.5

/** Sem piso de votos, vote_average.gte devolve obscuridades com nota 10 e
 *  três votos, e o pré-filtro deixaria passar exatamente o lixo. */
export const MIN_VOTE_COUNT = 200

/** Lista fechada em vez de faixa numérica: a interface só oferece quatro
 *  valores e a URL é entrada não confiável. Mesmo espírito tolerante do
 *  parseProviderCookie — lixo vira ausência, nunca erro. */
export function parseMinRating(raw: string | undefined): MinRating | null {
  if (raw === undefined) return null
  const valor = Number.parseInt(raw.trim(), 10)
  return (RATING_OPTIONS as readonly number[]).includes(valor)
    ? (valor as MinRating)
    : null
}

export function prefilterVoteAverage(min: MinRating): number {
  return min - PREFILTER_SLACK
}

/** Ausência de nota não satisfaz um limite: se o filtro diz "8 ou mais",
 *  tudo que aparece tem nota comprovada de 8 para cima. */
export function passesMinRating(
  imdbRating: number | null,
  min: MinRating,
): boolean {
  return imdbRating !== null && imdbRating >= min
}

/** Mantém a ordem original: ela é a classificação por popularidade, e
 *  reordenar faria a numeração da fileira de ranking mentir. */
export function filterByImdbRating(
  movies: readonly Movie[],
  ratings: ReadonlyMap<number, number | null>,
  min: MinRating,
): Movie[] {
  return movies.filter((movie) =>
    passesMinRating(ratings.get(movie.id) ?? null, min),
  )
}
```

- [ ] **Step 4: Rodar o teste e conferir que passa**

Run: `npm test -- lib/catalog/rating-filter.test.ts`
Expected: PASS, 16 testes

- [ ] **Step 5: Commit**

```bash
git add lib/catalog/rating-filter.ts lib/catalog/rating-filter.test.ts
git commit -m "feat: adiciona regras do filtro por nota minima"
```

---

### Task 6: Pré-filtro e `imdb_id` no cliente do TMDB

**Files:**
- Modify: `lib/tmdb/schema.ts`
- Modify: `lib/catalog/queries.ts`
- Test: `lib/catalog/queries.test.ts`

**Interfaces:**
- Consumes: `tmdbFetch`, `CACHE` já existentes
- Produces: `RawExternalIds { imdb_id: string | null }`, `DiscoverOptions` com `minVoteAverage?: number` e `minVoteCount?: number`, `getImdbId(id: number): Promise<string | null>`

- [ ] **Step 1: Escrever os testes que falham**

Acrescentar ao final de `lib/catalog/queries.test.ts` (e incluir `getImdbId` na lista de imports do topo do arquivo, junto de `discoverMovies`):

```ts
describe('discoverMovies com pré-filtro de nota', () => {
  beforeEach(() => tmdbFetch.mockResolvedValue(paginated([RAW])))
  afterEach(() => vi.clearAllMocks())

  it('não envia o pré-filtro quando não há filtro de nota', async () => {
    await discoverMovies({})
    const [, params] = tmdbFetch.mock.calls[0]
    expect(params['vote_average.gte']).toBeUndefined()
    expect(params['vote_count.gte']).toBeUndefined()
  })

  it('repassa o piso de nota e o piso de votos', async () => {
    await discoverMovies({ minVoteAverage: 7.5, minVoteCount: 200 })
    const [, params] = tmdbFetch.mock.calls[0]
    expect(params['vote_average.gte']).toBe(7.5)
    expect(params['vote_count.gte']).toBe(200)
  })
})

describe('getImdbId', () => {
  afterEach(() => vi.clearAllMocks())

  it('busca os ids externos do filme', async () => {
    tmdbFetch.mockResolvedValue({ imdb_id: 'tt0137523' })
    await getImdbId(550)
    const [path] = tmdbFetch.mock.calls[0]
    expect(path).toBe('/movie/550/external_ids')
  })

  it('devolve o tconst', async () => {
    tmdbFetch.mockResolvedValue({ imdb_id: 'tt0137523' })
    expect(await getImdbId(550)).toBe('tt0137523')
  })

  it('devolve null quando o TMDB não conhece o imdb_id', async () => {
    tmdbFetch.mockResolvedValue({ imdb_id: null })
    expect(await getImdbId(550)).toBeNull()
  })

  it('devolve null quando o campo nem vem na resposta', async () => {
    tmdbFetch.mockResolvedValue({})
    expect(await getImdbId(550)).toBeNull()
  })

  it('usa o cache longo de detalhe, de 24 horas', async () => {
    tmdbFetch.mockResolvedValue({ imdb_id: 'tt0137523' })
    await getImdbId(550)
    const [, , revalidate] = tmdbFetch.mock.calls[0]
    expect(revalidate).toBe(60 * 60 * 24)
  })
})
```

- [ ] **Step 2: Rodar os testes e conferir que falham**

Run: `npm test -- lib/catalog/queries.test.ts`
Expected: FAIL — `getImdbId is not a function` e os dois testes de pré-filtro reprovando

- [ ] **Step 3: Acrescentar o tipo dos ids externos**

Em `lib/tmdb/schema.ts`, logo depois da interface `RawWatchProviders`:

```ts
/** O /discover não devolve imdb_id. Sem esta chamada extra não há como ligar
 *  um filme do TMDB à sua nota no IMDb. */
export interface RawExternalIds {
  imdb_id?: string | null
}
```

- [ ] **Step 4: Implementar no queries.ts**

Em `lib/catalog/queries.ts`, acrescentar `RawExternalIds` à lista de imports vinda de `@/lib/tmdb/schema`.

Substituir a interface `DiscoverOptions` por:

```ts
export interface DiscoverOptions {
  providerIds?: number[]
  genreId?: number
  sortBy?: string
  page?: number
  /** Pré-filtro barato: corta a maioria dos reprovados antes da consulta
   *  cara ao IMDb. Quem calcula o valor é rating-filter.ts. */
  minVoteAverage?: number
  minVoteCount?: number
}
```

Substituir a assinatura e a chamada de `discoverMovies` por:

```ts
export async function discoverMovies({
  providerIds = [],
  genreId,
  sortBy = DEFAULT_SORT,
  page = 1,
  minVoteAverage,
  minVoteCount,
}: DiscoverOptions): Promise<Movie[]> {
  const data = await tmdbFetch<RawPaginated<RawMovie>>(
    '/discover/movie',
    {
      watch_region: WATCH_REGION,
      with_watch_monetization_types: 'flatrate',
      // Pipe significa OU. Vírgula significaria E — filmes presentes em
      // todos os serviços ao mesmo tempo, que não é o que o usuário quer.
      with_watch_providers:
        providerIds.length > 0 ? providerIds.join('|') : undefined,
      with_genres: genreId,
      sort_by: sortBy,
      page,
      'vote_average.gte': minVoteAverage,
      'vote_count.gte': minVoteCount,
    },
    CACHE.catalog,
  )
  return comPoster(data.results.map(toMovie))
}
```

Acrescentar, logo depois de `getAvailability`:

```ts
/** O tconst do filme no IMDb. Uma requisição por filme, cacheada 24h — é o
 *  único custo que sobra depois do pré-filtro e da deduplicação. */
export async function getImdbId(id: number): Promise<string | null> {
  const data = await tmdbFetch<RawExternalIds>(
    `/movie/${id}/external_ids`,
    {},
    CACHE.detail,
  )
  return data.imdb_id ?? null
}
```

- [ ] **Step 5: Rodar os testes e conferir que passam**

Run: `npm test -- lib/catalog/queries.test.ts`
Expected: PASS, incluindo os testes que já existiam no arquivo

- [ ] **Step 6: Commit**

```bash
git add lib/tmdb/schema.ts lib/catalog/queries.ts lib/catalog/queries.test.ts
git commit -m "feat: adiciona pre-filtro de nota e busca do imdb_id no tmdb"
```

---

### Task 7: Composição TMDB + IMDb

**Files:**
- Create: `lib/catalog/rated-discovery.ts`
- Test: `lib/catalog/rated-discovery.test.ts`

**Interfaces:**
- Consumes: `mapWithConcurrency` (Task 2), `getImdbRating` (Task 4), `filterByImdbRating` e `MinRating` (Task 5), `getImdbId` (Task 6)
- Produces: `IMDB_LOOKUP_CONCURRENCY = 8`, `resolveImdbRatings(tmdbIds: readonly number[]): Promise<Map<number, number | null>>`, `applyRatingToRails(rails: readonly Movie[][], min: MinRating): Promise<Movie[][]>`, `applyRatingToList(movies: readonly Movie[], min: MinRating): Promise<Movie[]>`

- [ ] **Step 1: Escrever o teste que falha**

Criar `lib/catalog/rated-discovery.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const getImdbId = vi.hoisted(() => vi.fn())
const getImdbRating = vi.hoisted(() => vi.fn())

vi.mock('./queries', () => ({ getImdbId }))
vi.mock('@/lib/imdb/ratings', () => ({ getImdbRating }))

import {
  applyRatingToList,
  applyRatingToRails,
  resolveImdbRatings,
} from './rated-discovery'
import type { Movie } from './types'

function movie(id: number): Movie {
  return {
    id,
    title: `Filme ${id}`,
    year: 1999,
    overview: '',
    posterUrl: '/p.jpg',
    backdropUrl: null,
    rating: 8,
    runtimeMinutes: null,
  }
}

/** tconst previsível a partir do id do TMDB, para os testes casarem os dois. */
function tconst(id: number): string {
  return `tt${String(id).padStart(7, '0')}`
}

describe('resolveImdbRatings', () => {
  beforeEach(() => {
    getImdbId.mockImplementation(async (id: number) => tconst(id))
    getImdbRating.mockReturnValue(8.5)
  })

  afterEach(() => vi.clearAllMocks())

  it('devolve a nota de cada filme, indexada pelo id do TMDB', async () => {
    const notas = await resolveImdbRatings([1, 2])
    expect(notas.get(1)).toBe(8.5)
    expect(notas.get(2)).toBe(8.5)
  })

  it('consulta cada filme uma única vez, mesmo repetido entre fileiras', async () => {
    await resolveImdbRatings([1, 2, 1, 2, 1])
    expect(getImdbId).toHaveBeenCalledTimes(2)
  })

  it('trata falha de rede como ausência de nota, sem propagar o erro', async () => {
    getImdbId.mockImplementation(async (id: number) => {
      if (id === 2) throw new Error('TMDB respondeu 500')
      return tconst(id)
    })
    const notas = await resolveImdbRatings([1, 2])
    expect(notas.get(1)).toBe(8.5)
    expect(notas.get(2)).toBeNull()
  })

  it('trata imdb_id ausente como ausência de nota', async () => {
    getImdbId.mockResolvedValue(null)
    const notas = await resolveImdbRatings([1])
    expect(notas.get(1)).toBeNull()
    expect(getImdbRating).not.toHaveBeenCalled()
  })

  it('não passa de oito consultas simultâneas', async () => {
    let vivas = 0
    let pico = 0
    getImdbId.mockImplementation(async (id: number) => {
      vivas++
      pico = Math.max(pico, vivas)
      await new Promise((r) => setTimeout(r, 1))
      vivas--
      return tconst(id)
    })

    await resolveImdbRatings(Array.from({ length: 40 }, (_, i) => i + 1))
    expect(pico).toBeLessThanOrEqual(8)
  })

  it('devolve mapa vazio sem consultar nada', async () => {
    const notas = await resolveImdbRatings([])
    expect(notas.size).toBe(0)
    expect(getImdbId).not.toHaveBeenCalled()
  })
})

describe('applyRatingToRails', () => {
  beforeEach(() => {
    getImdbId.mockImplementation(async (id: number) => tconst(id))
    getImdbRating.mockImplementation((t: string) =>
      t === tconst(2) ? 6.4 : 8.7,
    )
  })

  afterEach(() => vi.clearAllMocks())

  it('filtra cada fileira mantendo a estrutura de fileiras', async () => {
    const fileiras = await applyRatingToRails(
      [
        [movie(1), movie(2)],
        [movie(2), movie(3)],
      ],
      8,
    )
    expect(fileiras).toHaveLength(2)
    expect(fileiras[0].map((m) => m.id)).toEqual([1])
    expect(fileiras[1].map((m) => m.id)).toEqual([3])
  })

  it('resolve o filme repetido entre fileiras uma única vez', async () => {
    await applyRatingToRails(
      [
        [movie(1), movie(2)],
        [movie(2), movie(3)],
      ],
      8,
    )
    expect(getImdbId).toHaveBeenCalledTimes(3)
  })

  it('deixa a fileira vazia quando nada passa, sem removê-la da lista', async () => {
    const fileiras = await applyRatingToRails([[movie(2)]], 8)
    expect(fileiras).toHaveLength(1)
    expect(fileiras[0]).toEqual([])
  })
})

describe('applyRatingToList', () => {
  beforeEach(() => {
    getImdbId.mockImplementation(async (id: number) => tconst(id))
    getImdbRating.mockImplementation((t: string) =>
      t === tconst(2) ? 6.4 : 8.7,
    )
  })

  afterEach(() => vi.clearAllMocks())

  it('filtra uma lista simples', async () => {
    const filmes = await applyRatingToList([movie(1), movie(2), movie(3)], 8)
    expect(filmes.map((m) => m.id)).toEqual([1, 3])
  })
})
```

- [ ] **Step 2: Rodar o teste e conferir que falha**

Run: `npm test -- lib/catalog/rated-discovery.test.ts`
Expected: FAIL — `Failed to resolve import "./rated-discovery"`

- [ ] **Step 3: Implementar**

Criar `lib/catalog/rated-discovery.ts`:

```ts
import { mapWithConcurrency } from '@/lib/concurrency'
import { getImdbRating } from '@/lib/imdb/ratings'
import { getImdbId } from './queries'
import { filterByImdbRating, type MinRating } from './rating-filter'
import type { Movie } from './types'

/** Teto de chamadas simultâneas ao TMDB para resolver imdb_id. Resolver as
 *  quarenta de uma vez convida o 429; serializar deixaria a home fria lenta
 *  sem necessidade. */
export const IMDB_LOOKUP_CONCURRENCY = 8

/**
 * Resolve a nota do IMDb de cada filme, indexada pelo id do TMDB.
 *
 * A deduplicação é o ponto do módulo: um mesmo filme aparece na fileira de
 * populares e na fileira do serviço dele, e sem isso a home pagaria a mesma
 * consulta duas vezes. Falha de rede vira null, que o filtro descarta —
 * um filme a menos é melhor que uma fileira a menos.
 */
export async function resolveImdbRatings(
  tmdbIds: readonly number[],
): Promise<Map<number, number | null>> {
  const unicos = [...new Set(tmdbIds)]

  const notas = await mapWithConcurrency(
    unicos,
    IMDB_LOOKUP_CONCURRENCY,
    async (id) => {
      try {
        const tconst = await getImdbId(id)
        return tconst === null ? null : getImdbRating(tconst)
      } catch {
        return null
      }
    },
  )

  return new Map(unicos.map((id, i) => [id, notas[i]]))
}

/** Filtra várias fileiras com uma única rodada de consultas para o conjunto
 *  todo. A fileira que zera continua na lista: quem some com ela é o
 *  MovieRail, que já devolve null para lista vazia. */
export async function applyRatingToRails(
  rails: readonly Movie[][],
  min: MinRating,
): Promise<Movie[][]> {
  const notas = await resolveImdbRatings(rails.flat().map((movie) => movie.id))
  return rails.map((movies) => filterByImdbRating(movies, notas, min))
}

export async function applyRatingToList(
  movies: readonly Movie[],
  min: MinRating,
): Promise<Movie[]> {
  const [filtrados] = await applyRatingToRails([[...movies]], min)
  return filtrados
}
```

- [ ] **Step 4: Rodar o teste e conferir que passa**

Run: `npm test -- lib/catalog/rated-discovery.test.ts`
Expected: PASS, 10 testes

- [ ] **Step 5: Commit**

```bash
git add lib/catalog/rated-discovery.ts lib/catalog/rated-discovery.test.ts
git commit -m "feat: compoe descoberta do tmdb com as notas do imdb"
```

---

### Task 8: Modo da home e título da fileira

**Files:**
- Modify: `lib/catalog/home-mode.ts`
- Modify: `lib/catalog/rails.ts`
- Test: `lib/catalog/home-mode.test.ts`, `lib/catalog/rails.test.ts`

**Interfaces:**
- Consumes: nada de tasks anteriores
- Produces: `HomeParams` com `rating?: string`; `buildRailSpecs(selected: Provider[], hasRatingFilter?: boolean): RailSpec[]`

- [ ] **Step 1: Escrever os testes que falham**

Acrescentar ao `describe('resolveHomeMode')` em `lib/catalog/home-mode.test.ts`:

```ts
  it('continua em descoberta quando só a nota mínima foi escolhida', () => {
    expect(resolveHomeMode({ rating: '8' })).toBe('discovery')
  })

  it('vai para a grade quando a nota vem junto de gênero', () => {
    expect(resolveHomeMode({ rating: '8', genre: '27' })).toBe('filtered')
  })

  it('vai para a grade quando a nota vem junto de ordenação', () => {
    expect(resolveHomeMode({ rating: '8', sort: 'title.asc' })).toBe('filtered')
  })
```

Acrescentar ao `describe('buildRailSpecs')` em `lib/catalog/rails.test.ts`:

```ts
  it('tira o número do título quando há filtro de nota, sem serviço marcado', () => {
    const rails = buildRailSpecs([], true)
    expect(rails[0].title).toBe('Os mais populares no Brasil')
  })

  it('tira o número do título quando há filtro de nota, com serviço marcado', () => {
    const rails = buildRailSpecs([provider(8, 'Netflix')], true)
    expect(rails[0].title).toBe('Os mais populares nos seus streamings')
  })

  it('mantém o número quando não há filtro de nota', () => {
    expect(buildRailSpecs([], false)[0].title).toBe(
      'Os 10 mais populares no Brasil',
    )
  })

  it('não muda os títulos das fileiras de serviço', () => {
    const rails = buildRailSpecs([provider(8, 'Netflix')], true)
    expect(rails[1].title).toBe('Na Netflix')
  })
```

- [ ] **Step 2: Rodar os testes e conferir que falham**

Run: `npm test -- lib/catalog/home-mode.test.ts lib/catalog/rails.test.ts`
Expected: FAIL — os três títulos com "Os mais populares" reprovam; os de `home-mode` passam por acaso, porque `rating` ainda nem existe no tipo (o TypeScript é quem reclama)

- [ ] **Step 3: Acrescentar `rating` a HomeParams**

Em `lib/catalog/home-mode.ts`, substituir a interface por:

```ts
export interface HomeParams {
  genre?: string
  sort?: string
  /** A nota mínima entra aqui mas **não** conta na decisão de modo: ela é
   *  aplicada dentro das fileiras. Se trocasse o modo, o filtro nunca
   *  apareceria no modo descoberta, que é justamente onde ele foi pedido. */
  rating?: string
}
```

O corpo de `resolveHomeMode` não muda.

- [ ] **Step 4: Ajustar o título da fileira de ranking**

Em `lib/catalog/rails.ts`, substituir `buildRailSpecs` por:

```ts
export function buildRailSpecs(
  selected: Provider[],
  /** Com filtro de nota a fileira pode entregar quatro filmes, e um título
   *  que promete dez passaria a mentir — o mesmo cuidado que já impede o
   *  ranking de remover o destaque do topo. */
  hasRatingFilter = false,
): RailSpec[] {
  const providers = selected.slice(0, MAX_PROVIDERS)
  const quantos = hasRatingFilter ? 'Os' : 'Os 10'

  const popular: RailSpec = {
    key: 'popular',
    // Sem serviço marcado a fileira não é "sua": é o catálogo do país.
    title:
      providers.length === 0
        ? `${quantos} mais populares no Brasil`
        : `${quantos} mais populares nos seus streamings`,
    providerIds: providers.map((p) => p.id),
  }

  const perProvider = providers.map((provider) => ({
    key: `provider-${provider.id}`,
    title: `Na ${provider.name}`,
    providerIds: [provider.id],
  }))

  return [popular, ...perProvider]
}
```

- [ ] **Step 5: Rodar os testes e conferir que passam**

Run: `npm test -- lib/catalog/home-mode.test.ts lib/catalog/rails.test.ts`
Expected: PASS, incluindo os testes que já existiam

- [ ] **Step 6: Commit**

```bash
git add lib/catalog/home-mode.ts lib/catalog/home-mode.test.ts lib/catalog/rails.ts lib/catalog/rails.test.ts
git commit -m "feat: mantem descoberta com filtro de nota e ajusta titulo da fileira"
```

---

### Task 9: Seletor de nota na barra de filtros

**Files:**
- Modify: `components/filters/FilterBar.tsx`
- Test: `components/filters/FilterBar.test.tsx`

**Interfaces:**
- Consumes: `RATING_OPTIONS`, `MinRating` (Task 5)
- Produces: `FilterBarProps` com `activeRating?: MinRating | null`

- [ ] **Step 1: Escrever o teste que falha**

Criar `components/filters/FilterBar.test.tsx`:

O repositório **não usa jest-dom**: nenhum arquivo importa os matchers e o `vitest.setup.ts` não os registra. Todos os testes de componente afirmam com `toBeDefined()` e propriedades do DOM. Seguir esse padrão — `toHaveValue` falharia por matcher inexistente, não por bug.

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FilterBar } from './FilterBar'

const GENEROS = [
  { id: 27, name: 'Terror' },
  { id: 35, name: 'Comédia' },
]

function seletorDeNota(): HTMLSelectElement {
  return screen.getByLabelText('Nota mínima') as HTMLSelectElement
}

describe('FilterBar', () => {
  it('oferece as quatro faixas de nota mais a opção sem filtro', () => {
    render(<FilterBar genres={GENEROS} />)
    const opcoes = Array.from(seletorDeNota().options, (o) => o.textContent)
    expect(opcoes).toEqual([
      'Qualquer nota',
      'Nota 6 ou mais',
      'Nota 7 ou mais',
      'Nota 8 ou mais',
      'Nota 9 ou mais',
    ])
  })

  it('envia o campo com o nome rating', () => {
    render(<FilterBar genres={GENEROS} />)
    expect(seletorDeNota().name).toBe('rating')
  })

  it('deixa "Qualquer nota" marcada quando não há filtro ativo', () => {
    render(<FilterBar genres={GENEROS} />)
    expect(seletorDeNota().value).toBe('')
  })

  it('marca a faixa ativa quando ela vem da URL', () => {
    render(<FilterBar genres={GENEROS} activeRating={8} />)
    expect(seletorDeNota().value).toBe('8')
  })

  it('mantém gênero e ordenação funcionando ao lado da nota', () => {
    render(<FilterBar genres={GENEROS} activeGenre="27" activeSort="title.asc" />)
    expect((screen.getByLabelText('Gênero') as HTMLSelectElement).value).toBe('27')
    expect((screen.getByLabelText('Ordenar por') as HTMLSelectElement).value).toBe(
      'title.asc',
    )
  })

  it('continua sendo um formulário GET para a home, sem JavaScript', () => {
    const { container } = render(<FilterBar genres={GENEROS} />)
    const form = container.querySelector('form')
    expect(form?.getAttribute('action')).toBe('/')
  })
})
```

- [ ] **Step 2: Rodar o teste e conferir que falha**

Run: `npm test -- components/filters/FilterBar.test.tsx`
Expected: FAIL — `Unable to find a label with the text of: Nota mínima`

- [ ] **Step 3: Implementar**

Em `components/filters/FilterBar.tsx`, substituir o bloco de imports e a interface por:

```tsx
import {
  RATING_OPTIONS,
  type MinRating,
} from '@/lib/catalog/rating-filter'
import type { Genre } from '@/lib/catalog/types'

interface FilterBarProps {
  genres: Genre[]
  activeGenre?: string
  activeSort?: string
  /** Já validada: a página converte o parâmetro cru antes de passar. */
  activeRating?: MinRating | null
}

export function FilterBar({
  genres,
  activeGenre,
  activeSort,
  activeRating,
}: FilterBarProps) {
```

E inserir, logo depois do `<select id="sort" ...>` e antes do `<button type="submit">`:

```tsx
      <label className="sr-only" htmlFor="rating">
        Nota mínima
      </label>
      <select
        id="rating"
        name="rating"
        defaultValue={activeRating?.toString() ?? ''}
        className={FIELD}
      >
        <option value="">Qualquer nota</option>
        {RATING_OPTIONS.map((nota) => (
          // "ou mais" e não "acima de": a comparação inclui o próprio
          // limite, e o rótulo não deve prometer uma exclusão que não faz.
          <option key={nota} value={nota}>
            Nota {nota} ou mais
          </option>
        ))}
      </select>
```

- [ ] **Step 4: Rodar o teste e conferir que passa**

Run: `npm test -- components/filters/FilterBar.test.tsx`
Expected: PASS, 5 testes

- [ ] **Step 5: Commit**

```bash
git add components/filters/FilterBar.tsx components/filters/FilterBar.test.tsx
git commit -m "feat: adiciona seletor de nota minima na barra de filtros"
```

---

### Task 10: Ligar o filtro na home e verificar o cache

**Files:**
- Modify: `app/page.tsx`
- Modify: `e2e/catalog.spec.ts`

**Interfaces:**
- Consumes: tudo das tasks 5, 7, 8 e 9
- Produces: a funcionalidade completa

- [ ] **Step 1: Ligar o filtro na página**

Em `app/page.tsx`, acrescentar aos imports:

```tsx
import { applyRatingToRails, applyRatingToList } from '@/lib/catalog/rated-discovery'
import {
  MIN_VOTE_COUNT,
  parseMinRating,
  prefilterVoteAverage,
  type MinRating,
} from '@/lib/catalog/rating-filter'
```

Substituir a interface `HomePageProps` e o começo de `HomePage`:

```tsx
interface HomePageProps {
  searchParams: Promise<{
    genre?: string
    sort?: string
    rating?: string
    providers?: string
  }>
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams
  const mode = resolveHomeMode(params)
  // Convertida uma vez, aqui: daqui para baixo ninguém mais vê string.
  const minRating = parseMinRating(params.rating)
```

Substituir as duas chamadas dos modos, ao final do `return`:

```tsx
      {mode === 'discovery' ? (
        <DiscoveryMode
          selectedProviders={selectedProviders}
          selectedCount={selectedIds.length}
          genres={genres}
          minRating={minRating}
        />
      ) : (
        <FilteredMode
          providerIds={selectedIds}
          genres={genres}
          genre={params.genre}
          sort={params.sort}
          minRating={minRating}
        />
      )}
```

- [ ] **Step 2: Aplicar o filtro no modo descoberta**

Substituir `DiscoveryMode` inteira por:

```tsx
async function DiscoveryMode({
  selectedProviders,
  selectedCount,
  genres,
  minRating,
}: {
  selectedProviders: Provider[]
  selectedCount: number
  genres: Awaited<ReturnType<typeof getGenres>>
  minRating: MinRating | null
}) {
  const specs = buildRailSpecs(selectedProviders, minRating !== null)
  const byId = new Map(selectedProviders.map((p) => [p.id, p]))

  // Buscadas em paralelo. Uma fileira que falha vira lista vazia e some,
  // em vez de derrubar a home inteira.
  const results = await Promise.all(
    specs.map((spec) =>
      discoverMovies({
        providerIds: spec.providerIds,
        minVoteAverage:
          minRating === null ? undefined : prefilterVoteAverage(minRating),
        minVoteCount: minRating === null ? undefined : MIN_VOTE_COUNT,
      }).catch(() => [] as Movie[]),
    ),
  )

  // Uma rodada de consultas ao IMDb para o conjunto todo, deduplicado.
  const filtrados =
    minRating === null ? results : await applyRatingToRails(results, minRating)

  const featured = filtrados[0]?.[0]
  const included = await resolveIncluded(
    featured,
    selectedProviders.map((p) => p.id),
  )

  const rails = specs.map((spec, index) => ({
    spec,
    // A primeira fileira é uma classificação: mostra os dez primeiros na
    // ordem exata, sem tirar o destaque do topo — tirar deslocaria todas as
    // posições e a numeração passaria a mentir. O corte vem DEPOIS do filtro
    // de nota: cortar antes entregaria três filmes sob um título de dez.
    movies:
      index === 0 ? filtrados[0].slice(0, TAMANHO_RANKING) : filtrados[index],
    ranked: index === 0,
    // Só as fileiras de um serviço só carregam a marca no título.
    provider:
      spec.providerIds.length === 1 ? byId.get(spec.providerIds[0]) : undefined,
  }))

  return (
    <>
      <FeaturedMovie
        movie={featured}
        selectedCount={selectedCount}
        included={included}
      />

      <div className="wrap mt-6">
        <FilterBar genres={genres} activeRating={minRating} />
      </div>

      <div className="palco">
        {rails.map(({ spec, movies, provider, ranked }) => (
          <MovieRail
            key={spec.key}
            title={spec.title}
            movies={movies}
            provider={provider}
            ranked={ranked}
          />
        ))}
      </div>
    </>
  )
}
```

- [ ] **Step 3: Aplicar o filtro no modo filtrado**

Substituir `FilteredMode` inteira por:

```tsx
async function FilteredMode({
  providerIds,
  genres,
  genre,
  sort,
  minRating,
}: {
  providerIds: number[]
  genres: Awaited<ReturnType<typeof getGenres>>
  genre?: string
  sort?: string
  minRating: MinRating | null
}) {
  const encontrados = await discoverMovies({
    providerIds,
    genreId: genre ? Number.parseInt(genre, 10) : undefined,
    sortBy: sort || undefined,
    minVoteAverage:
      minRating === null ? undefined : prefilterVoteAverage(minRating),
    minVoteCount: minRating === null ? undefined : MIN_VOTE_COUNT,
  })

  const movies =
    minRating === null
      ? encontrados
      : await applyRatingToList(encontrados, minRating)

  return (
    <div className="wrap pt-10">
      <FilterBar
        genres={genres}
        activeGenre={genre}
        activeSort={sort}
        activeRating={minRating}
      />
      <div className="mt-10">
        <MovieGrid movies={movies} />
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Rodar a suíte inteira e o lint**

Run: `npm test`
Expected: PASS, todos os arquivos

Run: `npm run lint`
Expected: sem erros

Run: `npx tsc --noEmit`
Expected: sem erros

- [ ] **Step 5: Conferir na mão, no navegador**

Run: `npm run dev`

Abrir `http://localhost:3000/` e verificar:
1. A barra de filtros tem o terceiro seletor, com "Qualquer nota" marcada
2. O título da primeira fileira diz "Os 10 mais populares..."
3. Escolher "Nota 8 ou mais", clicar em Aplicar
4. A URL vira `/?genre=&sort=&rating=8`
5. **As fileiras continuam na tela** — não virou grade única
6. O título da primeira fileira agora diz "Os mais populares...", sem o "10"
7. As fileiras estão mais curtas que antes
8. Escolher um gênero junto da nota e aplicar: agora **vira grade única**

- [ ] **Step 6: Verificar a pendência de cache registrada na spec**

Esta é a premissa de custo do desenho inteiro: se o cache não engatar, a home quente deixa de ser gratuita.

Acrescentar temporariamente em `lib/tmdb/client.ts`, dentro de `tmdbFetch`, logo depois de `const url = buildUrl(path, params)`:

```ts
  if (path.includes('external_ids')) console.log('[cache-check]', path)
```

Com `npm run dev` rodando, carregar `http://localhost:3000/?rating=8` **duas vezes** e comparar o terminal:

- Primeira carga: várias linhas `[cache-check] /movie/.../external_ids`
- Segunda carga: **nenhuma linha nova**

Se a segunda carga repetir as linhas, o cache não engatou. Nesse caso, em `lib/tmdb/client.ts`, dentro de `tmdbFetch`, acrescentar ao objeto `init` — junto de `headers` — a linha:

```ts
    cache: 'force-cache' as RequestCache,
```

e repetir a verificação até a segunda carga ficar silenciosa.

Remover a linha de `console.log` antes de commitar, em qualquer um dos casos.

- [ ] **Step 7: Escrever o teste de ponta a ponta**

Acrescentar ao final de `e2e/catalog.spec.ts`:

```ts
test('filtra a home por nota minima sem sair do modo descoberta', async ({
  page,
}) => {
  await page.goto('/')

  const antes = await page
    .getByRole('heading', { level: 2 })
    .first()
    .textContent()
  expect(antes).toContain('10')

  await page.getByLabel('Nota mínima').selectOption('8')
  await page.getByRole('button', { name: /aplicar/i }).click()

  await expect(page).toHaveURL(/rating=8/)

  // Continua em descoberta: as fileiras seguem na tela, e o título da
  // fileira de ranking perde a promessa de dez.
  const depois = page.getByRole('heading', { level: 2 }).first()
  await expect(depois).toBeVisible()
  await expect(depois).toContainText(/mais populares/i)
  await expect(depois).not.toContainText('10')

  // O seletor lembra a escolha depois do recarregamento.
  await expect(page.getByLabel('Nota mínima')).toHaveValue('8')
})
```

- [ ] **Step 8: Rodar o teste de ponta a ponta**

Run: `npm run test:e2e`
Expected: PASS, os dois testes (precisa do `TMDB_ACCESS_TOKEN` em `.env.local`)

- [ ] **Step 9: Rodar o build de produção**

Run: `npm run build`
Expected: build conclui; o `prebuild` imprime a linha do índice de notas ou o aviso de que ele ainda está fresco

- [ ] **Step 10: Commit**

```bash
git add app/page.tsx e2e/catalog.spec.ts
git commit -m "feat: aplica o filtro de nota do imdb na home e na grade"
```

---

## Verificação final

- [ ] `npm test` — toda a suíte verde
- [ ] `npm run lint` — sem erros
- [ ] `npx tsc --noEmit` — sem erros
- [ ] `npm run test:e2e` — os dois testes verdes
- [ ] `npm run build` — build de produção conclui
- [ ] `git status --short` — `data/` não aparece
- [ ] Nenhum `console.log` de depuração sobrou em `lib/tmdb/client.ts`
- [ ] `git log --oneline -10` — dez commits, um por task
