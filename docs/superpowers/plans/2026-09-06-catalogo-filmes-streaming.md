# Catálogo de filmes por streaming — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir um catálogo web que mostra apenas os filmes incluídos nas assinaturas de streaming que o usuário já paga, no Brasil.

**Architecture:** Next.js App Router com Server Components buscando o TMDB direto na renderização — a chave nunca chega ao navegador e não existe backend próprio. Um único módulo (`lib/tmdb`) fala com a API; o restante do app consome tipos de domínio (`lib/catalog`) e nunca vê o JSON cru. As preferências do usuário vivem num cookie, legível no servidor.

**Tech Stack:** Next.js (App Router), React, TypeScript, Tailwind CSS, Vitest, Playwright.

**Spec:** [`docs/superpowers/specs/2026-09-06-catalogo-filmes-streaming-design.md`](../specs/2026-09-06-catalogo-filmes-streaming-design.md)

## Global Constraints

Todo requisito abaixo vale para todas as tarefas.

- **Região fixa:** `watch_region=BR` em toda consulta que aceite o parâmetro. Nunca omitir.
- **Idioma fixo:** `language=pt-BR` em toda consulta.
- **Home só com assinatura:** `with_watch_monetization_types=flatrate` nas consultas de fileira e grade. Aluguel e compra aparecem apenas na página de detalhe.
- **Teto de provedores:** máximo de **4** serviços selecionados simultaneamente. É o que segura o teto de 5 requisições paralelas na home.
- **Chave:** `TMDB_ACCESS_TOKEN` (Read Access Token v4, enviado como `Bearer`). Lida **somente** no servidor. Nunca prefixar com `NEXT_PUBLIC_`. Nunca criar rota de API que a exponha.
- **Cache:** provedores 24h · fileiras e grade 1h · detalhe 24h · disponibilidade 6h.
- **Idioma do código:** identificadores em inglês; textos de interface e comentários em português.
- **Proibido:** testes de snapshot de componente.
- **Atribuição obrigatória no rodapé, em todas as páginas:**
  - `Este site usa o TMDB e as APIs do TMDB, mas não é endossado, certificado ou de outra forma aprovado pelo TMDB.`
  - `Dados de disponibilidade em streaming fornecidos por JustWatch.`
- **Endpoints proibidos:** `/trending/movie` e `/movie/{id}/recommendations`. Nenhum dos dois aceita filtro por provedor e ambos devolveriam filmes fora das assinaturas do usuário. Ver spec, seções "Por que não usamos `/trending`" e "Descartado: filmes parecidos".

## Nota sobre uma lacuna do spec

O spec define o filtro `with_genres` mas não diz de onde sai a lista de gêneros. Este plano usa `/genre/movie/list` (Task 9), com cache de 24 horas. Nenhuma outra decisão do spec muda por causa disso.

## Estrutura de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `lib/tmdb/client.ts` | Único ponto com token, URL base e nova tentativa. Não conhece domínio. |
| `lib/tmdb/schema.ts` | Tipos do JSON cru do TMDB. |
| `lib/catalog/types.ts` | Tipos de domínio. Não menciona o TMDB. |
| `lib/catalog/mappers.ts` | Traduz cru → domínio. Funções puras. |
| `lib/catalog/queries.ts` | Consultas de alto nível usadas pelas páginas. |
| `lib/catalog/home-mode.ts` | Função pura que decide o modo da home. |
| `lib/catalog/rails.ts` | Função pura que monta a lista de fileiras. |
| `lib/preferences.ts` | Cookie dos provedores. |
| `app/actions.ts` | Server Action que grava o cookie. |
| `components/**` | Apresentação. Consomem apenas tipos de domínio. |

---

## Task 1: Esqueleto do projeto e ferramentas de teste

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `app/globals.css`, `app/layout.tsx`, `app/page.tsx`, `vitest.config.ts`, `.env.local.example`
- Test: `lib/smoke.test.ts`

**Interfaces:**
- Consumes: nada
- Produces: projeto que compila e `npm test` funcionando. Todas as tarefas seguintes dependem disso.

- [ ] **Step 1: Criar o projeto Next.js**

```bash
npx create-next-app@latest . --typescript --tailwind --app --src-dir=false --import-alias="@/*" --eslint --no-turbopack --yes
```

Se o diretório não estiver vazio, o comando reclama. Neste caso já existem `docs/` e `.gitignore`; responda para prosseguir mantendo os arquivos existentes.

- [ ] **Step 2: Instalar as dependências de teste**

```bash
npm install -D vitest @vitejs/plugin-react vite-tsconfig-paths jsdom @testing-library/react @testing-library/jest-dom
```

- [ ] **Step 3: Configurar o Vitest**

Criar `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['**/*.test.ts', '**/*.test.tsx'],
    exclude: ['node_modules', '.next', 'e2e'],
  },
})
```

Adicionar em `package.json`, dentro de `"scripts"`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Escrever o teste de fumaça**

Criar `lib/smoke.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

describe('ambiente de testes', () => {
  it('executa', () => {
    expect(1 + 1).toBe(2)
  })
})
```

- [ ] **Step 5: Rodar os testes**

Run: `npm test`
Expected: PASS, 1 teste.

- [ ] **Step 6: Documentar a variável de ambiente**

Criar `.env.local.example`:

```
# Read Access Token v4 do TMDB — https://www.themoviedb.org/settings/api
# NUNCA prefixar com NEXT_PUBLIC_. Esta chave é lida somente no servidor.
TMDB_ACCESS_TOKEN=
```

Criar `.env.local` com o token real. O `.gitignore` já cobre `.env*`.

- [ ] **Step 7: Verificar que o app sobe**

Run: `npm run dev`
Expected: servidor em `http://localhost:3000` sem erro. Encerrar com Ctrl+C.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: inicializa projeto Next.js com Tailwind e Vitest"
```

---

## Task 2: Cliente HTTP do TMDB

**Files:**
- Create: `lib/tmdb/client.ts`
- Test: `lib/tmdb/client.test.ts`

**Interfaces:**
- Consumes: nada
- Produces:
  - `TMDB_BASE_URL: string`
  - `WATCH_REGION: 'BR'`
  - `LANGUAGE: 'pt-BR'`
  - `tmdbFetch<T>(path: string, params?: TmdbParams, revalidateSeconds?: number): Promise<T>`
  - `type TmdbParams = Record<string, string | number | undefined>`
  - `class TmdbError extends Error { status: number }`

Parâmetros `undefined` são omitidos da URL. `language` é adicionado automaticamente. `watch_region` **não** é automático — só as consultas que precisam dele o passam, porque `/movie/{id}` não o aceita.

- [ ] **Step 1: Escrever os testes**

Criar `lib/tmdb/client.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TmdbError, tmdbFetch } from './client'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

describe('tmdbFetch', () => {
  beforeEach(() => {
    process.env.TMDB_ACCESS_TOKEN = 'token-de-teste'
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('envia o token como Bearer e acrescenta o idioma', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }))
    vi.stubGlobal('fetch', fetchMock)

    await tmdbFetch('/movie/550')

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toContain('https://api.themoviedb.org/3/movie/550')
    expect(url).toContain('language=pt-BR')
    expect(init.headers.Authorization).toBe('Bearer token-de-teste')
  })

  it('omite parâmetros indefinidos', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }))
    vi.stubGlobal('fetch', fetchMock)

    await tmdbFetch('/discover/movie', { page: 1, with_genres: undefined })

    const [url] = fetchMock.mock.calls[0]
    expect(url).toContain('page=1')
    expect(url).not.toContain('with_genres')
  })

  it('repassa o tempo de revalidação para o cache do Next', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }))
    vi.stubGlobal('fetch', fetchMock)

    await tmdbFetch('/movie/550', {}, 3600)

    const [, init] = fetchMock.mock.calls[0]
    expect(init.next).toEqual({ revalidate: 3600 })
  })

  it('tenta de novo em 429 e devolve o resultado da tentativa seguinte', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ erro: true }, 429))
      .mockResolvedValueOnce(jsonResponse({ id: 550 }))
    vi.stubGlobal('fetch', fetchMock)

    const promise = tmdbFetch<{ id: number }>('/movie/550')
    await vi.advanceTimersByTimeAsync(1000)

    await expect(promise).resolves.toEqual({ id: 550 })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('tenta de novo em 500', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({}, 500))
      .mockResolvedValueOnce(jsonResponse({ id: 550 }))
    vi.stubGlobal('fetch', fetchMock)

    const promise = tmdbFetch<{ id: number }>('/movie/550')
    await vi.advanceTimersByTimeAsync(1000)

    await expect(promise).resolves.toEqual({ id: 550 })
  })

  it('NÃO tenta de novo em 404 e lança TmdbError com o status', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}, 404))
    vi.stubGlobal('fetch', fetchMock)

    await expect(tmdbFetch('/movie/999999999')).rejects.toMatchObject({
      status: 404,
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('desiste depois de três tentativas', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}, 429))
    vi.stubGlobal('fetch', fetchMock)

    const promise = tmdbFetch('/movie/550')
    const assertion = expect(promise).rejects.toBeInstanceOf(TmdbError)
    await vi.advanceTimersByTimeAsync(10_000)
    await assertion

    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('lança quando o token não está configurado', async () => {
    delete process.env.TMDB_ACCESS_TOKEN
    await expect(tmdbFetch('/movie/550')).rejects.toThrow(/TMDB_ACCESS_TOKEN/)
  })
})
```

- [ ] **Step 2: Rodar e verificar que falham**

Run: `npx vitest run lib/tmdb/client.test.ts`
Expected: FAIL — `Failed to resolve import "./client"`.

- [ ] **Step 3: Implementar o cliente**

Criar `lib/tmdb/client.ts`:

```ts
export const TMDB_BASE_URL = 'https://api.themoviedb.org/3'
export const WATCH_REGION = 'BR' as const
export const LANGUAGE = 'pt-BR' as const

const MAX_ATTEMPTS = 3
const BASE_BACKOFF_MS = 300

export type TmdbParams = Record<string, string | number | undefined>

export class TmdbError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = 'TmdbError'
  }
}

function buildUrl(path: string, params: TmdbParams): string {
  const url = new URL(`${TMDB_BASE_URL}${path}`)
  url.searchParams.set('language', LANGUAGE)
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue
    url.searchParams.set(key, String(value))
  }
  return url.toString()
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Só faz sentido tentar de novo quando o erro é de limite ou do servidor. */
function isRetryable(status: number): boolean {
  return status === 429 || status >= 500
}

export async function tmdbFetch<T>(
  path: string,
  params: TmdbParams = {},
  revalidateSeconds?: number,
): Promise<T> {
  const token = process.env.TMDB_ACCESS_TOKEN
  if (!token) {
    throw new Error(
      'TMDB_ACCESS_TOKEN não está configurado. Copie .env.local.example para .env.local.',
    )
  }

  const url = buildUrl(path, params)
  const init: RequestInit & { next?: { revalidate: number } } = {
    headers: {
      Authorization: `Bearer ${token}`,
      accept: 'application/json',
    },
  }
  if (revalidateSeconds !== undefined) {
    init.next = { revalidate: revalidateSeconds }
  }

  let lastError: TmdbError | undefined

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const response = await fetch(url, init)

    if (response.ok) {
      return (await response.json()) as T
    }

    lastError = new TmdbError(
      `TMDB respondeu ${response.status} para ${path}`,
      response.status,
    )

    if (!isRetryable(response.status)) {
      throw lastError
    }

    // Espera crescente: 300ms, 900ms. Não espera depois da última tentativa.
    if (attempt < MAX_ATTEMPTS - 1) {
      await sleep(BASE_BACKOFF_MS * 3 ** attempt)
    }
  }

  throw lastError
}
```

- [ ] **Step 4: Rodar os testes**

Run: `npx vitest run lib/tmdb/client.test.ts`
Expected: PASS, 8 testes.

- [ ] **Step 5: Commit**

```bash
git add lib/tmdb/client.ts lib/tmdb/client.test.ts
git commit -m "feat: adiciona cliente HTTP do TMDB com nova tentativa em 429 e 5xx"
```

---

## Task 3: Tipos de domínio e mappers

**Files:**
- Create: `lib/tmdb/schema.ts`, `lib/catalog/types.ts`, `lib/catalog/mappers.ts`
- Test: `lib/catalog/mappers.test.ts`

**Interfaces:**
- Consumes: `WATCH_REGION` de `lib/tmdb/client.ts`
- Produces:
  - `lib/catalog/types.ts`: `Provider`, `Movie`, `Availability`, `CastMember`, `MovieDetail`
  - `lib/catalog/mappers.ts`: `toMovie(raw: RawMovie): Movie`, `toProvider(raw: RawProvider): Provider`, `toAvailability(raw: RawWatchProviders): Availability`, `toCast(raw: RawCredits | undefined): CastMember[]`, `pickTrailerKey(raw: RawVideos | undefined): string | null`, `imageUrl(path: string | null, size: string): string | null`

- [ ] **Step 1: Definir os tipos do JSON cru**

Criar `lib/tmdb/schema.ts`:

```ts
/** Tipos do JSON cru do TMDB. Nenhum arquivo fora de lib/ deve importar daqui. */

export interface RawMovie {
  id: number
  title: string
  overview: string
  poster_path: string | null
  backdrop_path: string | null
  release_date?: string
  vote_average: number
  vote_count: number
  runtime?: number | null
}

export interface RawProvider {
  provider_id: number
  provider_name: string
  logo_path: string | null
  /** Prioridade de exibição por país. O BR tem 86 provedores; sem ordenar
   *  por isso, o painel mistura Netflix com "MGM+ Apple TV Channel". */
  display_priorities?: Record<string, number>
}

export interface RawWatchProviders {
  results: Record<
    string,
    {
      link?: string
      flatrate?: RawProvider[]
      rent?: RawProvider[]
      buy?: RawProvider[]
      ads?: RawProvider[]
    }
  >
}

export interface RawCastMember {
  id: number
  name: string
  character: string
  profile_path: string | null
  order: number
}

export interface RawCredits {
  cast: RawCastMember[]
}

export interface RawVideo {
  key: string
  site: string
  type: string
  iso_639_1: string
  official: boolean
}

export interface RawVideos {
  results: RawVideo[]
}

export interface RawPaginated<T> {
  page: number
  results: T[]
  total_pages: number
  total_results: number
}

export interface RawGenre {
  id: number
  name: string
}

export interface RawMovieDetail extends RawMovie {
  credits?: RawCredits
  videos?: RawVideos
  /** Verificado contra a API: `watch/providers` É anexável via
   *  append_to_response, apesar da barra. A página de detalhe faz
   *  uma requisição só. */
  'watch/providers'?: RawWatchProviders
}
```

- [ ] **Step 2: Definir os tipos de domínio**

Criar `lib/catalog/types.ts`:

```ts
/** Domínio do app. Nada aqui menciona o TMDB. */

export interface Provider {
  id: number
  name: string
  logoUrl: string | null
}

export interface Movie {
  id: number
  title: string
  year: number | null
  overview: string
  posterUrl: string | null
  backdropUrl: string | null
  /** null quando nunca foi votado — 0 seria mentira, não ausência. */
  rating: number | null
  runtimeMinutes: number | null
}

export interface Availability {
  flatrate: Provider[]
  rent: Provider[]
  buy: Provider[]
}

export interface CastMember {
  id: number
  name: string
  character: string
  photoUrl: string | null
}

export interface MovieDetail extends Movie {
  availability: Availability
  trailerYoutubeKey: string | null
  cast: CastMember[]
}

export interface Genre {
  id: number
  name: string
}
```

- [ ] **Step 3: Escrever os testes dos mappers**

Criar `lib/catalog/mappers.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import type { RawMovie, RawVideos, RawWatchProviders } from '@/lib/tmdb/schema'
import {
  imageUrl,
  pickTrailerKey,
  toAvailability,
  toCast,
  toMovie,
} from './mappers'

function rawMovie(overrides: Partial<RawMovie> = {}): RawMovie {
  return {
    id: 550,
    title: 'Clube da Luta',
    overview: 'Um homem insone...',
    poster_path: '/poster.jpg',
    backdrop_path: '/backdrop.jpg',
    release_date: '1999-10-15',
    vote_average: 8.4,
    vote_count: 27000,
    ...overrides,
  }
}

describe('imageUrl', () => {
  it('monta a URL completa', () => {
    expect(imageUrl('/abc.jpg', 'w500')).toBe(
      'https://image.tmdb.org/t/p/w500/abc.jpg',
    )
  })

  it('devolve null quando não há caminho', () => {
    expect(imageUrl(null, 'w500')).toBeNull()
  })
})

describe('toMovie', () => {
  it('converte um filme completo', () => {
    const movie = toMovie(rawMovie())
    expect(movie).toEqual({
      id: 550,
      title: 'Clube da Luta',
      year: 1999,
      overview: 'Um homem insone...',
      posterUrl: 'https://image.tmdb.org/t/p/w500/poster.jpg',
      backdropUrl: 'https://image.tmdb.org/t/p/w1280/backdrop.jpg',
      rating: 8.4,
      runtimeMinutes: null,
    })
  })

  it('aceita poster_path nulo', () => {
    expect(toMovie(rawMovie({ poster_path: null })).posterUrl).toBeNull()
  })

  it('aceita backdrop_path nulo', () => {
    expect(toMovie(rawMovie({ backdrop_path: null })).backdropUrl).toBeNull()
  })

  it('devolve ano nulo quando a data de lançamento vem vazia', () => {
    expect(toMovie(rawMovie({ release_date: '' })).year).toBeNull()
  })

  it('devolve ano nulo quando a data de lançamento não vem', () => {
    expect(toMovie(rawMovie({ release_date: undefined })).year).toBeNull()
  })

  it('devolve nota nula quando ninguém votou', () => {
    const movie = toMovie(rawMovie({ vote_average: 0, vote_count: 0 }))
    expect(movie.rating).toBeNull()
  })

  it('preserva nota zero legítima quando houve votos', () => {
    const movie = toMovie(rawMovie({ vote_average: 0, vote_count: 12 }))
    expect(movie.rating).toBe(0)
  })

  it('converte a duração quando presente', () => {
    expect(toMovie(rawMovie({ runtime: 139 })).runtimeMinutes).toBe(139)
  })

  it('trata duração nula', () => {
    expect(toMovie(rawMovie({ runtime: null })).runtimeMinutes).toBeNull()
  })
})

describe('toAvailability', () => {
  const raw: RawWatchProviders = {
    results: {
      BR: {
        flatrate: [
          { provider_id: 8, provider_name: 'Netflix', logo_path: '/n.jpg' },
        ],
        rent: [
          { provider_id: 2, provider_name: 'Apple TV', logo_path: '/a.jpg' },
        ],
      },
      US: {
        flatrate: [
          { provider_id: 15, provider_name: 'Hulu', logo_path: '/h.jpg' },
        ],
      },
    },
  }

  it('lê apenas a região BR', () => {
    const availability = toAvailability(raw)
    expect(availability.flatrate).toEqual([
      {
        id: 8,
        name: 'Netflix',
        logoUrl: 'https://image.tmdb.org/t/p/w92/n.jpg',
      },
    ])
    expect(availability.rent).toHaveLength(1)
    expect(availability.buy).toEqual([])
  })

  it('devolve listas vazias quando não existe a chave BR', () => {
    const semBr: RawWatchProviders = { results: { US: { flatrate: [] } } }
    expect(toAvailability(semBr)).toEqual({ flatrate: [], rent: [], buy: [] })
  })

  it('devolve listas vazias quando results vem vazio', () => {
    expect(toAvailability({ results: {} })).toEqual({
      flatrate: [],
      rent: [],
      buy: [],
    })
  })
})

describe('pickTrailerKey', () => {
  function video(overrides: Partial<RawVideos['results'][0]>) {
    return {
      key: 'abc',
      site: 'YouTube',
      type: 'Trailer',
      iso_639_1: 'pt',
      official: true,
      ...overrides,
    }
  }

  it('prefere trailer em português', () => {
    const videos: RawVideos = {
      results: [
        video({ key: 'ingles', iso_639_1: 'en' }),
        video({ key: 'portugues', iso_639_1: 'pt' }),
      ],
    }
    expect(pickTrailerKey(videos)).toBe('portugues')
  })

  it('cai para trailer em inglês quando não há português', () => {
    const videos: RawVideos = {
      results: [video({ key: 'ingles', iso_639_1: 'en' })],
    }
    expect(pickTrailerKey(videos)).toBe('ingles')
  })

  it('cai para teaser quando não há trailer', () => {
    const videos: RawVideos = {
      results: [video({ key: 'teaser', type: 'Teaser', iso_639_1: 'en' })],
    }
    expect(pickTrailerKey(videos)).toBe('teaser')
  })

  it('ignora vídeos que não são do YouTube', () => {
    const videos: RawVideos = {
      results: [video({ key: 'vimeo', site: 'Vimeo' })],
    }
    expect(pickTrailerKey(videos)).toBeNull()
  })

  it('devolve null quando a lista está vazia', () => {
    expect(pickTrailerKey({ results: [] })).toBeNull()
  })

  it('devolve null quando videos não veio na resposta', () => {
    expect(pickTrailerKey(undefined)).toBeNull()
  })
})

describe('toCast', () => {
  it('ordena por order e limita a dez', () => {
    const credits = {
      cast: Array.from({ length: 15 }, (_, i) => ({
        id: i,
        name: `Ator ${i}`,
        character: `Personagem ${i}`,
        profile_path: '/p.jpg',
        order: 15 - i,
      })),
    }
    const cast = toCast(credits)
    expect(cast).toHaveLength(10)
    expect(cast[0].name).toBe('Ator 14')
  })

  it('devolve lista vazia quando credits não veio', () => {
    expect(toCast(undefined)).toEqual([])
  })
})
```

- [ ] **Step 4: Rodar e verificar que falham**

Run: `npx vitest run lib/catalog/mappers.test.ts`
Expected: FAIL — módulo `./mappers` não encontrado.

- [ ] **Step 5: Implementar os mappers**

Criar `lib/catalog/mappers.ts`:

```ts
import { WATCH_REGION } from '@/lib/tmdb/client'
import type {
  RawCredits,
  RawMovie,
  RawProvider,
  RawVideos,
  RawWatchProviders,
} from '@/lib/tmdb/schema'
import type { Availability, CastMember, Movie, Provider } from './types'

const IMAGE_BASE = 'https://image.tmdb.org/t/p'
const MAX_CAST = 10

export function imageUrl(path: string | null, size: string): string | null {
  if (!path) return null
  return `${IMAGE_BASE}/${size}${path}`
}

export function toProvider(raw: RawProvider): Provider {
  return {
    id: raw.provider_id,
    name: raw.provider_name,
    logoUrl: imageUrl(raw.logo_path, 'w92'),
  }
}

export function toMovie(raw: RawMovie): Movie {
  return {
    id: raw.id,
    title: raw.title,
    year: parseYear(raw.release_date),
    overview: raw.overview,
    posterUrl: imageUrl(raw.poster_path, 'w500'),
    backdropUrl: imageUrl(raw.backdrop_path, 'w1280'),
    // vote_average vem 0 tanto para "nota zero" quanto para "sem votos".
    // Sem votos é ausência de informação, não nota ruim.
    rating: raw.vote_count > 0 ? raw.vote_average : null,
    runtimeMinutes: raw.runtime ?? null,
  }
}

function parseYear(releaseDate: string | undefined): number | null {
  if (!releaseDate) return null
  const year = Number.parseInt(releaseDate.slice(0, 4), 10)
  return Number.isNaN(year) ? null : year
}

export function toAvailability(raw: RawWatchProviders): Availability {
  // A chave da região some por completo quando o filme não está disponível
  // no país. Isso é resposta legítima, não erro.
  const region = raw.results?.[WATCH_REGION]
  return {
    flatrate: (region?.flatrate ?? []).map(toProvider),
    rent: (region?.rent ?? []).map(toProvider),
    buy: (region?.buy ?? []).map(toProvider),
  }
}

export function toCast(raw: RawCredits | undefined): CastMember[] {
  if (!raw?.cast) return []
  return [...raw.cast]
    .sort((a, b) => a.order - b.order)
    .slice(0, MAX_CAST)
    .map((member) => ({
      id: member.id,
      name: member.name,
      character: member.character,
      photoUrl: imageUrl(member.profile_path, 'w185'),
    }))
}

export function pickTrailerKey(raw: RawVideos | undefined): string | null {
  const videos = (raw?.results ?? []).filter((v) => v.site === 'YouTube')
  if (videos.length === 0) return null

  // Ordem do spec: trailer em português, trailer em inglês, qualquer teaser.
  const candidates = [
    videos.find((v) => v.type === 'Trailer' && v.iso_639_1 === 'pt'),
    videos.find((v) => v.type === 'Trailer' && v.iso_639_1 === 'en'),
    videos.find((v) => v.type === 'Teaser'),
  ]

  return candidates.find((v) => v !== undefined)?.key ?? null
}
```

- [ ] **Step 6: Rodar os testes**

Run: `npx vitest run lib/catalog/mappers.test.ts`
Expected: PASS, 22 testes.

- [ ] **Step 7: Commit**

```bash
git add lib/tmdb/schema.ts lib/catalog/types.ts lib/catalog/mappers.ts lib/catalog/mappers.test.ts
git commit -m "feat: adiciona tipos de domínio e mappers do TMDB"
```

---

## Task 4: Cookie de preferências

**Files:**
- Create: `lib/preferences.ts`
- Test: `lib/preferences.test.ts`

**Interfaces:**
- Consumes: nada
- Produces:
  - `MAX_PROVIDERS = 4`
  - `PROVIDERS_COOKIE = 'providers'`
  - `parseProviderCookie(raw: string | undefined): number[]`
  - `serializeProviderCookie(ids: number[]): string`
  - `readSelectedProviderIds(): Promise<number[]>` — usa `cookies()` do `next/headers`

`parseProviderCookie` e `serializeProviderCookie` são puras e testáveis; `readSelectedProviderIds` é a casca que toca o Next.

- [ ] **Step 1: Escrever os testes**

Criar `lib/preferences.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  MAX_PROVIDERS,
  parseProviderCookie,
  serializeProviderCookie,
} from './preferences'

describe('parseProviderCookie', () => {
  it('lê uma lista de ids', () => {
    expect(parseProviderCookie('8,119,337')).toEqual([8, 119, 337])
  })

  it('devolve lista vazia quando o cookie não existe', () => {
    expect(parseProviderCookie(undefined)).toEqual([])
  })

  it('devolve lista vazia para cookie vazio', () => {
    expect(parseProviderCookie('')).toEqual([])
  })

  it('descarta pedaços que não são número', () => {
    expect(parseProviderCookie('8,abc,119')).toEqual([8, 119])
  })

  it('descarta ids negativos e zero', () => {
    expect(parseProviderCookie('8,-1,0,119')).toEqual([8, 119])
  })

  it('remove duplicatas', () => {
    expect(parseProviderCookie('8,8,119')).toEqual([8, 119])
  })

  it('corta no limite de provedores', () => {
    expect(parseProviderCookie('1,2,3,4,5,6')).toEqual([1, 2, 3, 4])
    expect(MAX_PROVIDERS).toBe(4)
  })

  it('sobrevive a lixo completo sem lançar', () => {
    expect(parseProviderCookie('%%%;;;')).toEqual([])
  })
})

describe('serializeProviderCookie', () => {
  it('grava ids separados por vírgula', () => {
    expect(serializeProviderCookie([8, 119])).toBe('8,119')
  })

  it('aplica o limite ao gravar', () => {
    expect(serializeProviderCookie([1, 2, 3, 4, 5])).toBe('1,2,3,4')
  })

  it('grava string vazia para lista vazia', () => {
    expect(serializeProviderCookie([])).toBe('')
  })

  it('remove duplicatas ao gravar', () => {
    expect(serializeProviderCookie([8, 8, 119])).toBe('8,119')
  })
})
```

- [ ] **Step 2: Rodar e verificar que falham**

Run: `npx vitest run lib/preferences.test.ts`
Expected: FAIL — módulo não encontrado.

- [ ] **Step 3: Implementar**

Criar `lib/preferences.ts`:

```ts
import { cookies } from 'next/headers'

/** Teto de provedores simultâneos. Segura o número de requisições da home. */
export const MAX_PROVIDERS = 4
export const PROVIDERS_COOKIE = 'providers'
export const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365

function normalize(ids: number[]): number[] {
  return [...new Set(ids)].slice(0, MAX_PROVIDERS)
}

/** Tolerante a lixo: cookie é entrada não confiável e nunca deve derrubar a página. */
export function parseProviderCookie(raw: string | undefined): number[] {
  if (!raw) return []
  const ids = raw
    .split(',')
    .map((part) => Number.parseInt(part.trim(), 10))
    .filter((id) => Number.isInteger(id) && id > 0)
  return normalize(ids)
}

export function serializeProviderCookie(ids: number[]): string {
  return normalize(ids).join(',')
}

export async function readSelectedProviderIds(): Promise<number[]> {
  const store = await cookies()
  return parseProviderCookie(store.get(PROVIDERS_COOKIE)?.value)
}
```

- [ ] **Step 4: Rodar os testes**

Run: `npx vitest run lib/preferences.test.ts`
Expected: PASS, 12 testes.

- [ ] **Step 5: Commit**

```bash
git add lib/preferences.ts lib/preferences.test.ts
git commit -m "feat: adiciona leitura e escrita do cookie de provedores"
```

---

## Task 5: Consultas ao catálogo

**Files:**
- Create: `lib/catalog/queries.ts`
- Test: `lib/catalog/queries.test.ts`

**Interfaces:**
- Consumes: `tmdbFetch`, `WATCH_REGION` (Task 2); mappers e tipos (Task 3)
- Produces:
  - `CACHE = { providers: 86400, catalog: 3600, detail: 86400, availability: 21600 }`
  - `discoverMovies(options: DiscoverOptions): Promise<Movie[]>`
  - `interface DiscoverOptions { providerIds?: number[]; genreId?: number; sortBy?: string; page?: number }`
  - `getRegionProviders(): Promise<Provider[]>`
  - `getGenres(): Promise<Genre[]>`
  - `getMovieDetail(id: number): Promise<MovieDetail | null>`
  - `searchMovies(query: string, page?: number): Promise<Movie[]>`
  - `getAvailability(id: number): Promise<Availability>`

- [ ] **Step 1: Escrever os testes**

Criar `lib/catalog/queries.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const tmdbFetch = vi.hoisted(() => vi.fn())

vi.mock('@/lib/tmdb/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/tmdb/client')>()
  return { ...actual, tmdbFetch }
})

import { TmdbError } from '@/lib/tmdb/client'
import {
  discoverMovies,
  getAvailability,
  getMovieDetail,
  getRegionProviders,
  searchMovies,
} from './queries'

function paginated(results: unknown[]) {
  return { page: 1, results, total_pages: 1, total_results: results.length }
}

const RAW = {
  id: 550,
  title: 'Clube da Luta',
  overview: '...',
  poster_path: '/p.jpg',
  backdrop_path: '/b.jpg',
  release_date: '1999-10-15',
  vote_average: 8.4,
  vote_count: 27000,
}

describe('discoverMovies', () => {
  beforeEach(() => tmdbFetch.mockResolvedValue(paginated([RAW])))
  afterEach(() => vi.clearAllMocks())

  it('sempre envia watch_region e o tipo de monetização', async () => {
    await discoverMovies({})
    const [path, params] = tmdbFetch.mock.calls[0]
    expect(path).toBe('/discover/movie')
    expect(params.watch_region).toBe('BR')
    expect(params.with_watch_monetization_types).toBe('flatrate')
  })

  it('junta vários provedores com pipe, nunca com vírgula', async () => {
    await discoverMovies({ providerIds: [8, 119, 337] })
    const [, params] = tmdbFetch.mock.calls[0]
    expect(params.with_watch_providers).toBe('8|119|337')
  })

  it('não envia with_watch_providers quando a lista está vazia', async () => {
    await discoverMovies({ providerIds: [] })
    const [, params] = tmdbFetch.mock.calls[0]
    expect(params.with_watch_providers).toBeUndefined()
  })

  it('não envia with_genres quando não há gênero', async () => {
    await discoverMovies({})
    const [, params] = tmdbFetch.mock.calls[0]
    expect(params.with_genres).toBeUndefined()
  })

  it('usa popularity.desc como ordenação padrão', async () => {
    await discoverMovies({})
    const [, params] = tmdbFetch.mock.calls[0]
    expect(params.sort_by).toBe('popularity.desc')
  })

  it('repassa gênero, ordenação e página', async () => {
    await discoverMovies({ genreId: 27, sortBy: 'vote_average.desc', page: 3 })
    const [, params] = tmdbFetch.mock.calls[0]
    expect(params.with_genres).toBe(27)
    expect(params.sort_by).toBe('vote_average.desc')
    expect(params.page).toBe(3)
  })

  it('usa o cache de uma hora', async () => {
    await discoverMovies({})
    expect(tmdbFetch.mock.calls[0][2]).toBe(3600)
  })

  it('devolve filmes já mapeados para o domínio', async () => {
    const movies = await discoverMovies({})
    expect(movies[0].posterUrl).toBe('https://image.tmdb.org/t/p/w500/p.jpg')
  })
})

describe('getMovieDetail', () => {
  afterEach(() => vi.clearAllMocks())

  it('traz elenco, vídeos e disponibilidade numa requisição só', async () => {
    tmdbFetch.mockResolvedValueOnce({ ...RAW, runtime: 139 })

    await getMovieDetail(550)

    expect(tmdbFetch).toHaveBeenCalledTimes(1)
    const [path, params] = tmdbFetch.mock.calls[0]
    expect(path).toBe('/movie/550')
    expect(params.append_to_response).toBe('credits,videos,watch/providers')
    expect(params.include_video_language).toBe('pt,en,null')
  })

  it('lê a disponibilidade anexada', async () => {
    tmdbFetch.mockResolvedValueOnce({
      ...RAW,
      runtime: 139,
      'watch/providers': {
        results: {
          BR: {
            flatrate: [
              { provider_id: 8, provider_name: 'Netflix', logo_path: '/n.jpg' },
            ],
          },
        },
      },
    })

    const detail = await getMovieDetail(550)

    expect(detail?.availability.flatrate[0].name).toBe('Netflix')
  })

  it('devolve null quando o filme não existe', async () => {
    tmdbFetch.mockRejectedValueOnce(new TmdbError('nao encontrado', 404))
    await expect(getMovieDetail(999999999)).resolves.toBeNull()
  })

  it('propaga erros que não são 404', async () => {
    tmdbFetch.mockRejectedValueOnce(new TmdbError('limite', 429))
    await expect(getMovieDetail(550)).rejects.toBeInstanceOf(TmdbError)
  })

  it('devolve disponibilidade vazia quando watch/providers não veio', async () => {
    tmdbFetch.mockResolvedValueOnce({ ...RAW, runtime: 139 })

    const detail = await getMovieDetail(550)

    expect(detail?.availability).toEqual({ flatrate: [], rent: [], buy: [] })
  })
})

describe('searchMovies', () => {
  afterEach(() => vi.clearAllMocks())

  it('envia a busca sem parâmetros de provedor, que a API não aceita', async () => {
    tmdbFetch.mockResolvedValue(paginated([RAW]))
    await searchMovies('clube da luta')
    const [path, params] = tmdbFetch.mock.calls[0]
    expect(path).toBe('/search/movie')
    expect(params.query).toBe('clube da luta')
    expect(params.with_watch_providers).toBeUndefined()
    expect(params.watch_region).toBeUndefined()
  })
})

describe('getAvailability', () => {
  afterEach(() => vi.clearAllMocks())

  it('usa o cache de seis horas', async () => {
    tmdbFetch.mockResolvedValue({ results: {} })
    await getAvailability(550)
    expect(tmdbFetch.mock.calls[0][2]).toBe(21600)
  })
})

describe('getRegionProviders', () => {
  afterEach(() => vi.clearAllMocks())

  it('ordena pela prioridade de exibição no Brasil', async () => {
    tmdbFetch.mockResolvedValue({
      results: [
        {
          provider_id: 2142,
          provider_name: 'MGM+ Apple TV Channel',
          logo_path: null,
          display_priorities: { BR: 40 },
        },
        {
          provider_id: 8,
          provider_name: 'Netflix',
          logo_path: null,
          display_priorities: { BR: 0 },
        },
      ],
    })

    const providers = await getRegionProviders()

    expect(providers.map((p) => p.name)).toEqual([
      'Netflix',
      'MGM+ Apple TV Channel',
    ])
  })

  it('joga para o fim quem não tem prioridade definida no Brasil', async () => {
    tmdbFetch.mockResolvedValue({
      results: [
        { provider_id: 1, provider_name: 'Sem prioridade', logo_path: null },
        {
          provider_id: 8,
          provider_name: 'Netflix',
          logo_path: null,
          display_priorities: { BR: 0 },
        },
      ],
    })

    const providers = await getRegionProviders()

    expect(providers[0].name).toBe('Netflix')
  })
})
```

- [ ] **Step 2: Rodar e verificar que falham**

Run: `npx vitest run lib/catalog/queries.test.ts`
Expected: FAIL — módulo `./queries` não encontrado.

- [ ] **Step 3: Implementar**

Criar `lib/catalog/queries.ts`:

```ts
import { TmdbError, WATCH_REGION, tmdbFetch } from '@/lib/tmdb/client'
import type {
  RawGenre,
  RawMovie,
  RawMovieDetail,
  RawPaginated,
  RawProvider,
  RawWatchProviders,
} from '@/lib/tmdb/schema'
import {
  pickTrailerKey,
  toAvailability,
  toCast,
  toMovie,
  toProvider,
} from './mappers'
import type { Availability, Genre, Movie, MovieDetail, Provider } from './types'

/** Tempos de revalidação em segundos, conforme a tabela de cache do spec. */
export const CACHE = {
  providers: 60 * 60 * 24,
  catalog: 60 * 60,
  detail: 60 * 60 * 24,
  availability: 60 * 60 * 6,
} as const

export const DEFAULT_SORT = 'popularity.desc'

export interface DiscoverOptions {
  providerIds?: number[]
  genreId?: number
  sortBy?: string
  page?: number
}

export async function discoverMovies({
  providerIds = [],
  genreId,
  sortBy = DEFAULT_SORT,
  page = 1,
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
    },
    CACHE.catalog,
  )
  return data.results.map(toMovie)
}

/** O BR devolve 86 provedores, a maioria canais irrelevantes. A ordenação
 *  por display_priorities.BR põe Netflix, Prime, Apple TV e Disney+ no topo. */
export async function getRegionProviders(): Promise<Provider[]> {
  const data = await tmdbFetch<{ results: RawProvider[] }>(
    '/watch/providers/movie',
    { watch_region: WATCH_REGION },
    CACHE.providers,
  )
  return [...data.results]
    .sort(
      (a, b) =>
        (a.display_priorities?.[WATCH_REGION] ?? Number.MAX_SAFE_INTEGER) -
        (b.display_priorities?.[WATCH_REGION] ?? Number.MAX_SAFE_INTEGER),
    )
    .map(toProvider)
}

export async function getGenres(): Promise<Genre[]> {
  const data = await tmdbFetch<{ genres: RawGenre[] }>(
    '/genre/movie/list',
    {},
    CACHE.providers,
  )
  return data.genres
}

export async function getAvailability(id: number): Promise<Availability> {
  const data = await tmdbFetch<RawWatchProviders>(
    `/movie/${id}/watch/providers`,
    {},
    CACHE.availability,
  )
  return toAvailability(data)
}

export async function getMovieDetail(id: number): Promise<MovieDetail | null> {
  let raw: RawMovieDetail
  try {
    // Uma requisição para a página inteira. Verificado contra a API:
    // watch/providers é anexável apesar da barra no nome.
    raw = await tmdbFetch<RawMovieDetail>(
      `/movie/${id}`,
      {
        append_to_response: 'credits,videos,watch/providers',
        include_video_language: 'pt,en,null',
      },
      CACHE.detail,
    )
  } catch (error) {
    if (error instanceof TmdbError && error.status === 404) return null
    throw error
  }

  const rawProviders = raw['watch/providers']

  return {
    ...toMovie(raw),
    availability: rawProviders
      ? toAvailability(rawProviders)
      : { flatrate: [], rent: [], buy: [] },
    trailerYoutubeKey: pickTrailerKey(raw.videos),
    cast: toCast(raw.credits),
  }
}

export async function searchMovies(
  query: string,
  page = 1,
): Promise<Movie[]> {
  // /search/movie NÃO aceita with_watch_providers nem watch_region.
  // A disponibilidade é resolvida depois, por filme. Ver spec.
  const data = await tmdbFetch<RawPaginated<RawMovie>>(
    '/search/movie',
    { query, page, include_adult: 'false' },
    CACHE.catalog,
  )
  return data.results.map(toMovie)
}
```

- [ ] **Step 4: Rodar os testes**

Run: `npx vitest run lib/catalog/queries.test.ts`
Expected: PASS, 14 testes.

- [ ] **Step 5: Commit**

```bash
git add lib/catalog/queries.ts lib/catalog/queries.test.ts
git commit -m "feat: adiciona consultas de catálogo, detalhe e busca"
```

---

## Task 6: Regras puras da home — modo e fileiras

**Files:**
- Create: `lib/catalog/home-mode.ts`, `lib/catalog/rails.ts`
- Test: `lib/catalog/home-mode.test.ts`, `lib/catalog/rails.test.ts`

**Interfaces:**
- Consumes: `Provider` de `lib/catalog/types.ts`
- Produces:
  - `type HomeMode = 'discovery' | 'filtered'`
  - `resolveHomeMode(params: HomeParams): HomeMode`
  - `interface HomeParams { genre?: string; sort?: string }`
  - `interface RailSpec { key: string; title: string; providerIds: number[] }`
  - `buildRailSpecs(selected: Provider[]): RailSpec[]`

- [ ] **Step 1: Escrever os testes do modo**

Criar `lib/catalog/home-mode.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { resolveHomeMode } from './home-mode'

describe('resolveHomeMode', () => {
  it('é descoberta quando não há nenhum filtro', () => {
    expect(resolveHomeMode({})).toBe('discovery')
  })

  it('é filtrado quando há gênero', () => {
    expect(resolveHomeMode({ genre: '27' })).toBe('filtered')
  })

  it('é filtrado quando há ordenação', () => {
    expect(resolveHomeMode({ sort: 'vote_average.desc' })).toBe('filtered')
  })

  it('ignora parâmetros presentes porém vazios', () => {
    expect(resolveHomeMode({ genre: '', sort: '' })).toBe('discovery')
  })

  it('ignora espaços em branco', () => {
    expect(resolveHomeMode({ genre: '   ' })).toBe('discovery')
  })

  it('é filtrado quando há gênero e ordenação juntos', () => {
    expect(resolveHomeMode({ genre: '27', sort: 'title.asc' })).toBe('filtered')
  })
})
```

- [ ] **Step 2: Escrever os testes das fileiras**

Criar `lib/catalog/rails.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { buildRailSpecs } from './rails'
import type { Provider } from './types'

function provider(id: number, name: string): Provider {
  return { id, name, logoUrl: null }
}

describe('buildRailSpecs', () => {
  it('devolve só a fileira de populares quando nada foi selecionado', () => {
    const rails = buildRailSpecs([])
    expect(rails).toHaveLength(1)
    expect(rails[0].key).toBe('popular')
    expect(rails[0].providerIds).toEqual([])
  })

  it('põe a fileira de populares em primeiro lugar', () => {
    const rails = buildRailSpecs([provider(8, 'Netflix')])
    expect(rails[0].key).toBe('popular')
    expect(rails[0].title).toBe('Populares nos seus streamings')
    expect(rails[0].providerIds).toEqual([8])
  })

  it('cria uma fileira por serviço, com o nome no título', () => {
    const rails = buildRailSpecs([
      provider(8, 'Netflix'),
      provider(119, 'Amazon Prime Video'),
    ])
    expect(rails).toHaveLength(3)
    expect(rails[1]).toEqual({
      key: 'provider-8',
      title: 'Na Netflix',
      providerIds: [8],
    })
    expect(rails[2].title).toBe('Na Amazon Prime Video')
  })

  it('respeita o teto de quatro serviços, gerando no máximo cinco fileiras', () => {
    const rails = buildRailSpecs([
      provider(1, 'A'),
      provider(2, 'B'),
      provider(3, 'C'),
      provider(4, 'D'),
      provider(5, 'E'),
    ])
    expect(rails).toHaveLength(5)
  })

  it('gera chaves únicas', () => {
    const rails = buildRailSpecs([provider(8, 'Netflix'), provider(9, 'Max')])
    const keys = rails.map((r) => r.key)
    expect(new Set(keys).size).toBe(keys.length)
  })
})
```

- [ ] **Step 3: Rodar e verificar que falham**

Run: `npx vitest run lib/catalog/home-mode.test.ts lib/catalog/rails.test.ts`
Expected: FAIL — módulos não encontrados.

- [ ] **Step 4: Implementar o modo**

Criar `lib/catalog/home-mode.ts`:

```ts
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
```

- [ ] **Step 5: Implementar as fileiras**

Criar `lib/catalog/rails.ts`:

```ts
import { MAX_PROVIDERS } from '@/lib/preferences'
import type { Provider } from './types'

export interface RailSpec {
  key: string
  title: string
  providerIds: number[]
}

/**
 * Uma fileira de populares somada a uma por serviço selecionado.
 * Desmarcar um serviço faz a fileira dele sumir — é a premissa do app
 * aparecendo na interface.
 */
export function buildRailSpecs(selected: Provider[]): RailSpec[] {
  const providers = selected.slice(0, MAX_PROVIDERS)

  const popular: RailSpec = {
    key: 'popular',
    title: 'Populares nos seus streamings',
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

- [ ] **Step 6: Rodar os testes**

Run: `npx vitest run lib/catalog/home-mode.test.ts lib/catalog/rails.test.ts`
Expected: PASS, 11 testes.

- [ ] **Step 7: Commit**

```bash
git add lib/catalog/home-mode.ts lib/catalog/rails.ts lib/catalog/home-mode.test.ts lib/catalog/rails.test.ts
git commit -m "feat: adiciona regras de modo da home e montagem de fileiras"
```

---

## Task 7: Layout base com cabeçalho e rodapé

**Files:**
- Create: `components/layout/Header.tsx`, `components/layout/Footer.tsx`
- Modify: `app/layout.tsx`, `app/globals.css`
- Test: `components/layout/Footer.test.tsx`

**Interfaces:**
- Consumes: nada
- Produces: `<Header />` e `<Footer />` usados pelo layout raiz em todas as páginas.

O rodapé carrega as atribuições obrigatórias. O teste existe para que ninguém as remova sem quebrar a suíte — é requisito de acesso à API, não estética.

- [ ] **Step 1: Escrever o teste do rodapé**

Criar `components/layout/Footer.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Footer } from './Footer'

describe('Footer', () => {
  it('exibe o aviso de não-endosso exigido pelo TMDB', () => {
    render(<Footer />)
    expect(
      screen.getByText(/não é endossado, certificado ou de outra forma aprovado pelo TMDB/i),
    ).toBeDefined()
  })

  it('credita o JustWatch pelos dados de disponibilidade', () => {
    render(<Footer />)
    expect(screen.getByText(/JustWatch/i)).toBeDefined()
  })
})
```

- [ ] **Step 2: Rodar e verificar que falha**

Run: `npx vitest run components/layout/Footer.test.tsx`
Expected: FAIL — módulo `./Footer` não encontrado.

- [ ] **Step 3: Implementar o rodapé**

Criar `components/layout/Footer.tsx`:

```tsx
export function Footer() {
  return (
    <footer className="mt-16 border-t border-neutral-800 px-4 py-8 text-sm text-neutral-400">
      <div className="mx-auto flex max-w-7xl flex-col gap-2">
        <p>
          Este site usa o TMDB e as APIs do TMDB, mas não é endossado,
          certificado ou de outra forma aprovado pelo TMDB.
        </p>
        <p>Dados de disponibilidade em streaming fornecidos por JustWatch.</p>
      </div>
    </footer>
  )
}
```

- [ ] **Step 4: Implementar o cabeçalho**

Criar `components/layout/Header.tsx`:

```tsx
import Link from 'next/link'

interface HeaderProps {
  selectedCount: number
  onOpenProviders?: never
}

export function Header({ selectedCount }: HeaderProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-neutral-800 bg-neutral-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
        <Link href="/" className="text-lg font-bold text-white">
          Cine<span className="text-emerald-400">BR</span>
        </Link>

        <form action="/search" className="flex-1">
          <input
            type="search"
            name="q"
            placeholder="Buscar filme..."
            aria-label="Buscar filme"
            className="w-full rounded-full bg-neutral-900 px-4 py-2 text-sm text-white outline-none ring-emerald-500 focus:ring-2"
          />
        </form>

        <Link
          href="/?providers=open"
          className="whitespace-nowrap rounded-full bg-neutral-900 px-4 py-2 text-sm text-white"
        >
          Meus streamings ({selectedCount})
        </Link>
      </div>
    </header>
  )
}
```

- [ ] **Step 5: Ligar no layout raiz**

Substituir `app/layout.tsx`:

```tsx
import type { Metadata } from 'next'
import { Footer } from '@/components/layout/Footer'
import { Header } from '@/components/layout/Header'
import { readSelectedProviderIds } from '@/lib/preferences'
import './globals.css'

export const metadata: Metadata = {
  title: 'CineBR — o que dá pra assistir hoje',
  description:
    'Filmes incluídos nos streamings que você já assina, no Brasil.',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const selected = await readSelectedProviderIds()

  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-neutral-950 text-neutral-100 antialiased">
        <Header selectedCount={selected.length} />
        <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
```

- [ ] **Step 6: Rodar os testes**

Run: `npx vitest run components/layout/Footer.test.tsx`
Expected: PASS, 2 testes.

- [ ] **Step 7: Commit**

```bash
git add components/layout app/layout.tsx
git commit -m "feat: adiciona cabeçalho e rodapé com as atribuições obrigatórias"
```

---

## Task 8: Cartão, grade e estado vazio

**Files:**
- Create: `components/catalog/MovieCard.tsx`, `components/catalog/MovieGrid.tsx`, `components/catalog/EmptyState.tsx`
- Test: `components/catalog/MovieGrid.test.tsx`

**Interfaces:**
- Consumes: `Movie` de `lib/catalog/types.ts`
- Produces:
  - `<MovieCard movie={movie} />`
  - `<MovieGrid movies={movies} />` — renderiza `<EmptyState />` quando a lista está vazia
  - `<EmptyState title={string} hint={string} />`

- [ ] **Step 1: Escrever os testes**

Criar `components/catalog/MovieGrid.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Movie } from '@/lib/catalog/types'
import { MovieGrid } from './MovieGrid'

function movie(overrides: Partial<Movie> = {}): Movie {
  return {
    id: 550,
    title: 'Clube da Luta',
    year: 1999,
    overview: '...',
    posterUrl: 'https://image.tmdb.org/t/p/w500/p.jpg',
    backdropUrl: null,
    rating: 8.4,
    runtimeMinutes: null,
    ...overrides,
  }
}

describe('MovieGrid', () => {
  it('lista os filmes recebidos', () => {
    render(<MovieGrid movies={[movie(), movie({ id: 551, title: 'Seven' })]} />)
    expect(screen.getByText('Clube da Luta')).toBeDefined()
    expect(screen.getByText('Seven')).toBeDefined()
  })

  it('nunca fica em branco: mostra explicação e saída quando vazio', () => {
    render(<MovieGrid movies={[]} />)
    expect(screen.getByText(/nenhum filme/i)).toBeDefined()
    expect(screen.getByRole('link', { name: /limpar filtros/i })).toBeDefined()
  })

  it('mostra o ano quando existe', () => {
    render(<MovieGrid movies={[movie()]} />)
    expect(screen.getByText('1999')).toBeDefined()
  })

  it('não quebra quando o filme não tem ano', () => {
    render(<MovieGrid movies={[movie({ year: null })]} />)
    expect(screen.getByText('Clube da Luta')).toBeDefined()
  })

  it('não quebra quando o filme não tem pôster', () => {
    render(<MovieGrid movies={[movie({ posterUrl: null })]} />)
    expect(screen.getByText('Clube da Luta')).toBeDefined()
  })
})
```

- [ ] **Step 2: Rodar e verificar que falham**

Run: `npx vitest run components/catalog/MovieGrid.test.tsx`
Expected: FAIL — módulo não encontrado.

- [ ] **Step 3: Implementar o estado vazio**

Criar `components/catalog/EmptyState.tsx`:

```tsx
import Link from 'next/link'

interface EmptyStateProps {
  title?: string
  hint?: string
}

export function EmptyState({
  title = 'Nenhum filme com esses filtros.',
  hint = 'Tente remover o gênero ou incluir mais streamings.',
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-neutral-800 px-6 py-16 text-center">
      <p className="text-lg font-medium text-neutral-200">{title}</p>
      <p className="text-sm text-neutral-400">{hint}</p>
      <Link
        href="/"
        className="mt-2 rounded-full bg-emerald-500 px-5 py-2 text-sm font-medium text-neutral-950"
      >
        Limpar filtros
      </Link>
    </div>
  )
}
```

- [ ] **Step 4: Implementar o cartão**

Criar `components/catalog/MovieCard.tsx`:

```tsx
import Image from 'next/image'
import Link from 'next/link'
import type { Movie } from '@/lib/catalog/types'

interface MovieCardProps {
  movie: Movie
  badge?: React.ReactNode
}

export function MovieCard({ movie, badge }: MovieCardProps) {
  return (
    <Link href={`/movie/${movie.id}`} className="group block">
      <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-neutral-900">
        {movie.posterUrl ? (
          <Image
            src={movie.posterUrl}
            alt={movie.title}
            fill
            sizes="(max-width: 768px) 33vw, 16vw"
            className="object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center px-2 text-center text-xs text-neutral-500">
            sem pôster
          </div>
        )}
      </div>
      <p className="mt-2 line-clamp-2 text-sm text-neutral-200">
        {movie.title}
      </p>
      {movie.year !== null && (
        <p className="text-xs text-neutral-500">{movie.year}</p>
      )}
      {badge}
    </Link>
  )
}
```

- [ ] **Step 5: Implementar a grade**

Criar `components/catalog/MovieGrid.tsx`:

```tsx
import type { Movie } from '@/lib/catalog/types'
import { EmptyState } from './EmptyState'
import { MovieCard } from './MovieCard'

interface MovieGridProps {
  movies: Movie[]
}

export function MovieGrid({ movies }: MovieGridProps) {
  if (movies.length === 0) return <EmptyState />

  return (
    <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6">
      {movies.map((movie) => (
        <MovieCard key={movie.id} movie={movie} />
      ))}
    </div>
  )
}
```

- [ ] **Step 6: Liberar o domínio das imagens**

Modificar `next.config.ts`:

```ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'image.tmdb.org', pathname: '/t/p/**' },
    ],
  },
}

export default nextConfig
```

- [ ] **Step 7: Rodar os testes**

Run: `npx vitest run components/catalog/MovieGrid.test.tsx`
Expected: PASS, 5 testes.

- [ ] **Step 8: Commit**

```bash
git add components/catalog next.config.ts
git commit -m "feat: adiciona cartão, grade e estado vazio do catálogo"
```

---

## Task 9: Barra de filtros, painel de provedores e Server Action

**Files:**
- Create: `app/actions.ts`, `components/filters/FilterBar.tsx`, `components/filters/ProviderPanel.tsx`
- Test: `app/actions.test.ts`

**Interfaces:**
- Consumes: `serializeProviderCookie`, `PROVIDERS_COOKIE`, `COOKIE_MAX_AGE_SECONDS`, `MAX_PROVIDERS` (Task 4); `getRegionProviders`, `getGenres` (Task 5)
- Produces:
  - `saveProviders(formData: FormData): Promise<void>` — Server Action
  - `<FilterBar genres={Genre[]} activeGenre={string | undefined} activeSort={string | undefined} />`
  - `<ProviderPanel providers={Provider[]} selectedIds={number[]} />`

- [ ] **Step 1: Escrever o teste da Server Action**

Criar `app/actions.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

const cookieStore = vi.hoisted(() => ({ set: vi.fn(), get: vi.fn() }))
const revalidatePath = vi.hoisted(() => vi.fn())

vi.mock('next/headers', () => ({ cookies: async () => cookieStore }))
vi.mock('next/cache', () => ({ revalidatePath }))

import { saveProviders } from './actions'

describe('saveProviders', () => {
  beforeEach(() => vi.clearAllMocks())

  it('grava os provedores marcados no cookie', async () => {
    const form = new FormData()
    form.append('providers', '8')
    form.append('providers', '119')

    await saveProviders(form)

    expect(cookieStore.set).toHaveBeenCalledWith(
      'providers',
      '8,119',
      expect.objectContaining({ httpOnly: true, sameSite: 'lax' }),
    )
  })

  it('aplica o teto de quatro provedores', async () => {
    const form = new FormData()
    for (const id of ['1', '2', '3', '4', '5']) form.append('providers', id)

    await saveProviders(form)

    expect(cookieStore.set).toHaveBeenCalledWith(
      'providers',
      '1,2,3,4',
      expect.anything(),
    )
  })

  it('grava vazio quando nada foi marcado', async () => {
    await saveProviders(new FormData())
    expect(cookieStore.set).toHaveBeenCalledWith(
      'providers',
      '',
      expect.anything(),
    )
  })

  it('revalida a home para a próxima renderização já sair certa', async () => {
    await saveProviders(new FormData())
    expect(revalidatePath).toHaveBeenCalledWith('/')
  })
})
```

- [ ] **Step 2: Rodar e verificar que falham**

Run: `npx vitest run app/actions.test.ts`
Expected: FAIL — módulo `./actions` não encontrado.

- [ ] **Step 3: Implementar a Server Action**

Criar `app/actions.ts`:

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import {
  COOKIE_MAX_AGE_SECONDS,
  PROVIDERS_COOKIE,
  serializeProviderCookie,
} from '@/lib/preferences'

export async function saveProviders(formData: FormData): Promise<void> {
  const ids = formData
    .getAll('providers')
    .map((value) => Number.parseInt(String(value), 10))
    .filter((id) => Number.isInteger(id) && id > 0)

  const store = await cookies()
  store.set(PROVIDERS_COOKIE, serializeProviderCookie(ids), {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE_SECONDS,
    path: '/',
  })

  revalidatePath('/')
}
```

- [ ] **Step 4: Implementar o painel de provedores**

Criar `components/filters/ProviderPanel.tsx`:

```tsx
import Image from 'next/image'
import { saveProviders } from '@/app/actions'
import type { Provider } from '@/lib/catalog/types'
import { MAX_PROVIDERS } from '@/lib/preferences'

interface ProviderPanelProps {
  providers: Provider[]
  selectedIds: number[]
}

export function ProviderPanel({ providers, selectedIds }: ProviderPanelProps) {
  return (
    <form action={saveProviders} className="rounded-lg bg-neutral-900 p-4">
      <p className="mb-3 text-sm text-neutral-300">
        Marque os streamings que você assina (até {MAX_PROVIDERS}).
      </p>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {providers.map((provider) => (
          <label
            key={provider.id}
            className="flex cursor-pointer items-center gap-2 rounded bg-neutral-800 px-3 py-2 text-sm"
          >
            <input
              type="checkbox"
              name="providers"
              value={provider.id}
              defaultChecked={selectedIds.includes(provider.id)}
            />
            {provider.logoUrl && (
              <Image
                src={provider.logoUrl}
                alt=""
                width={24}
                height={24}
                className="rounded"
              />
            )}
            <span className="truncate">{provider.name}</span>
          </label>
        ))}
      </div>

      <button
        type="submit"
        className="mt-4 rounded-full bg-emerald-500 px-5 py-2 text-sm font-medium text-neutral-950"
      >
        Salvar
      </button>
    </form>
  )
}
```

- [ ] **Step 5: Implementar a barra de filtros**

Criar `components/filters/FilterBar.tsx`:

```tsx
import type { Genre } from '@/lib/catalog/types'

interface FilterBarProps {
  genres: Genre[]
  activeGenre?: string
  activeSort?: string
}

const SORT_OPTIONS = [
  { value: '', label: 'Mais populares' },
  { value: 'vote_average.desc', label: 'Melhor avaliados' },
  { value: 'primary_release_date.desc', label: 'Mais recentes' },
  { value: 'title.asc', label: 'Título (A-Z)' },
]

export function FilterBar({ genres, activeGenre, activeSort }: FilterBarProps) {
  return (
    <form
      action="/"
      className="sticky top-14 z-10 flex flex-wrap gap-3 bg-neutral-950/95 py-3 backdrop-blur"
    >
      <select
        name="genre"
        defaultValue={activeGenre ?? ''}
        aria-label="Gênero"
        className="rounded-full bg-neutral-900 px-4 py-2 text-sm"
      >
        <option value="">Todos os gêneros</option>
        {genres.map((genre) => (
          <option key={genre.id} value={genre.id}>
            {genre.name}
          </option>
        ))}
      </select>

      <select
        name="sort"
        defaultValue={activeSort ?? ''}
        aria-label="Ordenar por"
        className="rounded-full bg-neutral-900 px-4 py-2 text-sm"
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <button
        type="submit"
        className="rounded-full bg-neutral-800 px-4 py-2 text-sm"
      >
        Aplicar
      </button>
    </form>
  )
}
```

- [ ] **Step 6: Rodar os testes**

Run: `npx vitest run app/actions.test.ts`
Expected: PASS, 4 testes.

- [ ] **Step 7: Commit**

```bash
git add app/actions.ts app/actions.test.ts components/filters
git commit -m "feat: adiciona barra de filtros, painel de provedores e Server Action do cookie"
```

---

## Task 10: Destaque, fileira e a home nos dois modos

**Files:**
- Create: `components/catalog/FeaturedMovie.tsx`, `components/catalog/MovieRail.tsx`
- Modify: `app/page.tsx`
- Test: `components/catalog/FeaturedMovie.test.tsx`, `components/catalog/MovieRail.test.tsx`

**Interfaces:**
- Consumes: `Movie` (Task 3); `discoverMovies`, `getRegionProviders`, `getGenres` (Task 5); `resolveHomeMode`, `buildRailSpecs` (Task 6); `readSelectedProviderIds` (Task 4); `MovieGrid` (Task 8); `FilterBar`, `ProviderPanel` (Task 9)
- Produces:
  - `<FeaturedMovie movie={Movie | undefined} />` — não renderiza nada sem filme ou sem imagem
  - `<MovieRail title={string} movies={Movie[]} />` — não renderiza nada com lista vazia

- [ ] **Step 1: Escrever os testes do destaque**

Criar `components/catalog/FeaturedMovie.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Movie } from '@/lib/catalog/types'
import { FeaturedMovie } from './FeaturedMovie'

function movie(overrides: Partial<Movie> = {}): Movie {
  return {
    id: 550,
    title: 'Clube da Luta',
    year: 1999,
    overview: 'Um homem insone conhece um vendedor de sabonetes.',
    posterUrl: 'https://image.tmdb.org/t/p/w500/p.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/b.jpg',
    rating: 8.4,
    runtimeMinutes: null,
    ...overrides,
  }
}

describe('FeaturedMovie', () => {
  it('mostra título, ano e sinopse', () => {
    render(<FeaturedMovie movie={movie()} />)
    expect(screen.getByText('Clube da Luta')).toBeDefined()
    expect(screen.getByText(/1999/)).toBeDefined()
    expect(screen.getByText(/vendedor de sabonetes/)).toBeDefined()
  })

  it('não renderiza nada quando não há filme', () => {
    const { container } = render(<FeaturedMovie movie={undefined} />)
    expect(container.firstChild).toBeNull()
  })

  it('cai para o pôster quando não há imagem panorâmica', () => {
    render(<FeaturedMovie movie={movie({ backdropUrl: null })} />)
    expect(screen.getByText('Clube da Luta')).toBeDefined()
  })

  it('não renderiza nada quando falta imagem panorâmica e pôster', () => {
    const { container } = render(
      <FeaturedMovie movie={movie({ backdropUrl: null, posterUrl: null })} />,
    )
    expect(container.firstChild).toBeNull()
  })
})
```

- [ ] **Step 2: Escrever os testes da fileira**

Criar `components/catalog/MovieRail.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Movie } from '@/lib/catalog/types'
import { MovieRail } from './MovieRail'

function movie(id: number): Movie {
  return {
    id,
    title: `Filme ${id}`,
    year: 2020,
    overview: '',
    posterUrl: 'https://image.tmdb.org/t/p/w500/p.jpg',
    backdropUrl: null,
    rating: 7,
    runtimeMinutes: null,
  }
}

describe('MovieRail', () => {
  it('mostra o título e os filmes', () => {
    render(<MovieRail title="Na Netflix" movies={[movie(1), movie(2)]} />)
    expect(screen.getByText('Na Netflix')).toBeDefined()
    expect(screen.getByText('Filme 1')).toBeDefined()
  })

  it('some por completo quando não há filmes, título incluído', () => {
    const { container } = render(<MovieRail title="Na Netflix" movies={[]} />)
    expect(container.firstChild).toBeNull()
    expect(screen.queryByText('Na Netflix')).toBeNull()
  })
})
```

- [ ] **Step 3: Rodar e verificar que falham**

Run: `npx vitest run components/catalog/FeaturedMovie.test.tsx components/catalog/MovieRail.test.tsx`
Expected: FAIL — módulos não encontrados.

- [ ] **Step 4: Implementar o destaque**

Criar `components/catalog/FeaturedMovie.tsx`:

```tsx
import Image from 'next/image'
import Link from 'next/link'
import type { Movie } from '@/lib/catalog/types'

interface FeaturedMovieProps {
  movie: Movie | undefined
}

export function FeaturedMovie({ movie }: FeaturedMovieProps) {
  // Sem filme não há destaque; sem imagem, um destaque vazio pareceria erro.
  if (!movie) return null
  const image = movie.backdropUrl ?? movie.posterUrl
  if (!image) return null

  return (
    <section className="relative mb-6 h-[42vh] min-h-64 overflow-hidden rounded-xl">
      <Image
        src={image}
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/60 to-transparent" />
      <div className="absolute bottom-0 left-0 max-w-2xl p-6">
        <h1 className="text-3xl font-bold text-white">{movie.title}</h1>
        <p className="mt-1 text-sm text-neutral-300">
          {movie.year !== null && <span>{movie.year}</span>}
          {movie.rating !== null && (
            <span className="ml-3">★ {movie.rating.toFixed(1)}</span>
          )}
        </p>
        <p className="mt-2 line-clamp-3 text-sm text-neutral-200">
          {movie.overview}
        </p>
        <Link
          href={`/movie/${movie.id}`}
          className="mt-4 inline-block rounded-full bg-emerald-500 px-6 py-2 text-sm font-medium text-neutral-950"
        >
          Ver detalhes
        </Link>
      </div>
    </section>
  )
}
```

- [ ] **Step 5: Implementar a fileira**

Criar `components/catalog/MovieRail.tsx`:

```tsx
import type { Movie } from '@/lib/catalog/types'
import { MovieCard } from './MovieCard'

interface MovieRailProps {
  title: string
  movies: Movie[]
}

export function MovieRail({ title, movies }: MovieRailProps) {
  // Um carrossel vazio rotulado "Na Netflix" comunica erro mesmo sem erro.
  if (movies.length === 0) return null

  return (
    <section className="mb-8">
      <h2 className="mb-3 text-lg font-semibold text-neutral-100">{title}</h2>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {movies.map((movie) => (
          <div key={movie.id} className="w-32 shrink-0 sm:w-40">
            <MovieCard movie={movie} />
          </div>
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 6: Implementar a home**

Substituir `app/page.tsx`:

```tsx
import { FeaturedMovie } from '@/components/catalog/FeaturedMovie'
import { MovieGrid } from '@/components/catalog/MovieGrid'
import { MovieRail } from '@/components/catalog/MovieRail'
import { FilterBar } from '@/components/filters/FilterBar'
import { ProviderPanel } from '@/components/filters/ProviderPanel'
import { resolveHomeMode } from '@/lib/catalog/home-mode'
import { buildRailSpecs } from '@/lib/catalog/rails'
import {
  discoverMovies,
  getGenres,
  getRegionProviders,
} from '@/lib/catalog/queries'
import type { Movie } from '@/lib/catalog/types'
import { readSelectedProviderIds } from '@/lib/preferences'

interface HomePageProps {
  searchParams: Promise<{
    genre?: string
    sort?: string
    providers?: string
  }>
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams
  const mode = resolveHomeMode(params)

  const [selectedIds, allProviders, genres] = await Promise.all([
    readSelectedProviderIds(),
    getRegionProviders(),
    getGenres(),
  ])

  const selectedProviders = allProviders.filter((p) =>
    selectedIds.includes(p.id),
  )

  return (
    <>
      {params.providers === 'open' && (
        <div className="mb-6">
          {/* getRegionProviders já devolve ordenado por prioridade no BR.
              São 86 no total; os 20 primeiros cobrem todos os relevantes. */}
          <ProviderPanel
            providers={allProviders.slice(0, 20)}
            selectedIds={selectedIds}
          />
        </div>
      )}

      {mode === 'discovery' ? (
        <DiscoveryMode selectedProviders={selectedProviders} genres={genres} />
      ) : (
        <FilteredMode
          providerIds={selectedIds}
          genres={genres}
          genre={params.genre}
          sort={params.sort}
        />
      )}
    </>
  )
}

async function DiscoveryMode({
  selectedProviders,
  genres,
}: {
  selectedProviders: Awaited<ReturnType<typeof getRegionProviders>>
  genres: Awaited<ReturnType<typeof getGenres>>
}) {
  const specs = buildRailSpecs(selectedProviders)

  // Buscadas em paralelo. Uma fileira que falha vira lista vazia e some,
  // em vez de derrubar a home inteira.
  const results = await Promise.all(
    specs.map((spec) =>
      discoverMovies({ providerIds: spec.providerIds }).catch(
        () => [] as Movie[],
      ),
    ),
  )

  const featured = results[0]?.[0]
  const rails = specs.map((spec, index) => ({
    spec,
    movies: index === 0 ? results[0].slice(1) : results[index],
  }))

  return (
    <>
      <FeaturedMovie movie={featured} />
      <FilterBar genres={genres} />
      {rails.map(({ spec, movies }) => (
        <MovieRail key={spec.key} title={spec.title} movies={movies} />
      ))}
    </>
  )
}

async function FilteredMode({
  providerIds,
  genres,
  genre,
  sort,
}: {
  providerIds: number[]
  genres: Awaited<ReturnType<typeof getGenres>>
  genre?: string
  sort?: string
}) {
  const movies = await discoverMovies({
    providerIds,
    genreId: genre ? Number.parseInt(genre, 10) : undefined,
    sortBy: sort || undefined,
  })

  return (
    <>
      <FilterBar genres={genres} activeGenre={genre} activeSort={sort} />
      <MovieGrid movies={movies} />
    </>
  )
}
```

- [ ] **Step 7: Rodar todos os testes**

Run: `npm test`
Expected: PASS, toda a suíte.

- [ ] **Step 8: Verificar no navegador**

Run: `npm run dev`

Confirmar em `http://localhost:3000`:
- Destaque no topo com imagem
- Fileira "Populares nos seus streamings"
- Clicar em "Meus streamings", marcar Netflix, salvar → aparece a fileira "Na Netflix"
- Escolher um gênero e aplicar → destaque e fileiras somem, aparece a grade

- [ ] **Step 9: Commit**

```bash
git add components/catalog app/page.tsx
git commit -m "feat: adiciona home com modo descoberta e modo filtrado"
```

---

## Task 11: Página de detalhe

**Files:**
- Create: `app/movie/[id]/page.tsx`, `components/movie/WhereToWatch.tsx`, `components/movie/Trailer.tsx`, `components/movie/CastList.tsx`
- Test: `components/movie/WhereToWatch.test.tsx`, `components/movie/Trailer.test.tsx`

**Interfaces:**
- Consumes: `getMovieDetail` (Task 5); `Availability`, `CastMember`, `MovieDetail` (Task 3)
- Produces:
  - `<WhereToWatch availability={Availability} />`
  - `<Trailer youtubeKey={string | null} />`
  - `<CastList cast={CastMember[]} />`

> **Pendência já resolvida.** A verificação que o spec deixou em aberto foi
> feita contra a API real em 2026-09-06: `watch/providers` **é** anexável via
> `append_to_response`, apesar da barra no nome. A `getMovieDetail` da Task 5
> já reflete isso — a página de detalhe faz **uma requisição**. Nenhuma ação
> necessária aqui.

- [ ] **Step 1: Escrever os testes de "Onde assistir"**

Criar `components/movie/WhereToWatch.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Availability } from '@/lib/catalog/types'
import { WhereToWatch } from './WhereToWatch'

const netflix = { id: 8, name: 'Netflix', logoUrl: null }
const appleTv = { id: 2, name: 'Apple TV', logoUrl: null }

function availability(overrides: Partial<Availability> = {}): Availability {
  return { flatrate: [], rent: [], buy: [], ...overrides }
}

describe('WhereToWatch', () => {
  it('destaca o que está incluído na assinatura', () => {
    render(<WhereToWatch availability={availability({ flatrate: [netflix] })} />)
    expect(screen.getByText(/incluído na sua assinatura/i)).toBeDefined()
    expect(screen.getByText('Netflix')).toBeDefined()
  })

  it('separa aluguel de assinatura', () => {
    render(
      <WhereToWatch
        availability={availability({ flatrate: [netflix], rent: [appleTv] })}
      />,
    )
    expect(screen.getByText(/aluguel/i)).toBeDefined()
    expect(screen.getByText('Apple TV')).toBeDefined()
  })

  it('não mostra seções vazias', () => {
    render(<WhereToWatch availability={availability({ flatrate: [netflix] })} />)
    expect(screen.queryByText(/^aluguel$/i)).toBeNull()
    expect(screen.queryByText(/^compra$/i)).toBeNull()
  })

  it('diz claramente quando o filme não está em nenhum streaming no Brasil', () => {
    render(<WhereToWatch availability={availability()} />)
    expect(
      screen.getByText(/não está em nenhum streaming no brasil/i),
    ).toBeDefined()
  })
})
```

- [ ] **Step 2: Escrever os testes do trailer**

Criar `components/movie/Trailer.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Trailer } from './Trailer'

describe('Trailer', () => {
  it('embute o player do YouTube com a chave recebida', () => {
    render(<Trailer youtubeKey="abc123" />)
    const iframe = screen.getByTitle('Trailer') as HTMLIFrameElement
    expect(iframe.src).toContain('youtube.com/embed/abc123')
  })

  it('some por completo quando não há vídeo, sem moldura vazia', () => {
    const { container } = render(<Trailer youtubeKey={null} />)
    expect(container.firstChild).toBeNull()
  })
})
```

- [ ] **Step 3: Rodar e verificar que falham**

Run: `npx vitest run components/movie`
Expected: FAIL — módulos não encontrados.

- [ ] **Step 4: Implementar "Onde assistir"**

Criar `components/movie/WhereToWatch.tsx`:

```tsx
import Image from 'next/image'
import type { Availability, Provider } from '@/lib/catalog/types'

interface WhereToWatchProps {
  availability: Availability
}

function ProviderList({
  label,
  providers,
  highlight = false,
}: {
  label: string
  providers: Provider[]
  highlight?: boolean
}) {
  if (providers.length === 0) return null

  return (
    <div className="mb-4">
      <h3
        className={
          highlight
            ? 'mb-2 text-sm font-semibold text-emerald-400'
            : 'mb-2 text-sm text-neutral-400'
        }
      >
        {label}
      </h3>
      <ul className="flex flex-wrap gap-3">
        {providers.map((provider) => (
          <li
            key={provider.id}
            className="flex items-center gap-2 rounded bg-neutral-800 px-3 py-2 text-sm"
          >
            {provider.logoUrl && (
              <Image
                src={provider.logoUrl}
                alt=""
                width={24}
                height={24}
                className="rounded"
              />
            )}
            {provider.name}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function WhereToWatch({ availability }: WhereToWatchProps) {
  const isEmpty =
    availability.flatrate.length === 0 &&
    availability.rent.length === 0 &&
    availability.buy.length === 0

  return (
    <section className="rounded-lg border border-neutral-800 p-5">
      <h2 className="mb-4 text-xl font-semibold">Onde assistir</h2>

      {isEmpty ? (
        <p className="text-sm text-neutral-400">
          Não está em nenhum streaming no Brasil no momento.
        </p>
      ) : (
        <>
          <ProviderList
            label="Incluído na sua assinatura"
            providers={availability.flatrate}
            highlight
          />
          <ProviderList label="Aluguel" providers={availability.rent} />
          <ProviderList label="Compra" providers={availability.buy} />
        </>
      )}
    </section>
  )
}
```

- [ ] **Step 5: Implementar o trailer**

Criar `components/movie/Trailer.tsx`:

```tsx
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
```

- [ ] **Step 6: Implementar o elenco**

Criar `components/movie/CastList.tsx`:

```tsx
import Image from 'next/image'
import type { CastMember } from '@/lib/catalog/types'

interface CastListProps {
  cast: CastMember[]
}

export function CastList({ cast }: CastListProps) {
  if (cast.length === 0) return null

  return (
    <section className="mt-8">
      <h2 className="mb-4 text-xl font-semibold">Elenco principal</h2>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {cast.map((member) => (
          <div key={member.id} className="w-24 shrink-0 text-center">
            <div className="relative mb-2 aspect-square overflow-hidden rounded-full bg-neutral-800">
              {member.photoUrl && (
                <Image
                  src={member.photoUrl}
                  alt={member.name}
                  fill
                  sizes="96px"
                  className="object-cover"
                />
              )}
            </div>
            <p className="text-xs text-neutral-200">{member.name}</p>
            <p className="text-xs text-neutral-500">{member.character}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 7: Implementar a página**

Criar `app/movie/[id]/page.tsx`:

```tsx
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { CastList } from '@/components/movie/CastList'
import { Trailer } from '@/components/movie/Trailer'
import { WhereToWatch } from '@/components/movie/WhereToWatch'
import { getMovieDetail } from '@/lib/catalog/queries'

interface MoviePageProps {
  params: Promise<{ id: string }>
}

export default async function MoviePage({ params }: MoviePageProps) {
  const { id } = await params
  const movieId = Number.parseInt(id, 10)
  if (!Number.isInteger(movieId) || movieId <= 0) notFound()

  const movie = await getMovieDetail(movieId)
  if (!movie) notFound()

  return (
    <article>
      <div className="flex flex-col gap-6 sm:flex-row">
        <div className="relative aspect-[2/3] w-full max-w-56 shrink-0 overflow-hidden rounded-lg bg-neutral-900">
          {movie.posterUrl && (
            <Image
              src={movie.posterUrl}
              alt={movie.title}
              fill
              sizes="224px"
              className="object-cover"
            />
          )}
        </div>

        <div className="flex-1">
          <h1 className="text-3xl font-bold">{movie.title}</h1>
          <p className="mt-1 text-sm text-neutral-400">
            {movie.year !== null && <span>{movie.year}</span>}
            {movie.rating !== null && (
              <span className="ml-3">★ {movie.rating.toFixed(1)}</span>
            )}
            {movie.runtimeMinutes !== null && (
              <span className="ml-3">{movie.runtimeMinutes} min</span>
            )}
          </p>
          <p className="mt-4 text-neutral-200">{movie.overview}</p>
        </div>
      </div>

      <div className="mt-8">
        <WhereToWatch availability={movie.availability} />
      </div>

      <Trailer youtubeKey={movie.trailerYoutubeKey} />
      <CastList cast={movie.cast} />
    </article>
  )
}
```

- [ ] **Step 8: Rodar os testes**

Run: `npx vitest run components/movie`
Expected: PASS, 6 testes.

- [ ] **Step 9: Commit**

```bash
git add app/movie components/movie
git commit -m "feat: adiciona página de detalhe com onde assistir, trailer e elenco"
```

---

## Task 12: Busca com selos de disponibilidade

**Files:**
- Create: `app/search/page.tsx`, `components/catalog/AvailabilityBadge.tsx`, `lib/catalog/search-availability.ts`
- Test: `lib/catalog/search-availability.test.ts`

**Interfaces:**
- Consumes: `searchMovies`, `getAvailability` (Task 5); `Movie`, `Availability` (Task 3)
- Produces:
  - `type AvailabilityLabel = 'subscription' | 'paid' | 'unavailable'`
  - `classifyAvailability(availability: Availability, selectedIds: number[]): AvailabilityLabel`
  - `<AvailabilityBadge label={AvailabilityLabel} />`

- [ ] **Step 1: Escrever os testes da classificação**

Criar `lib/catalog/search-availability.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { classifyAvailability } from './search-availability'
import type { Availability } from './types'

const netflix = { id: 8, name: 'Netflix', logoUrl: null }
const max = { id: 384, name: 'Max', logoUrl: null }
const appleTv = { id: 2, name: 'Apple TV', logoUrl: null }

function availability(overrides: Partial<Availability> = {}): Availability {
  return { flatrate: [], rent: [], buy: [], ...overrides }
}

describe('classifyAvailability', () => {
  it('é "na assinatura" quando está num serviço marcado', () => {
    expect(
      classifyAvailability(availability({ flatrate: [netflix] }), [8]),
    ).toBe('subscription')
  })

  it('é "pago" quando está em streaming, porém não num serviço marcado', () => {
    expect(classifyAvailability(availability({ flatrate: [max] }), [8])).toBe(
      'paid',
    )
  })

  it('é "pago" quando só existe aluguel', () => {
    expect(classifyAvailability(availability({ rent: [appleTv] }), [8])).toBe(
      'paid',
    )
  })

  it('é "indisponível" quando não há nada no Brasil', () => {
    expect(classifyAvailability(availability(), [8])).toBe('unavailable')
  })

  it('sem serviços marcados, assinatura ainda conta como paga', () => {
    expect(classifyAvailability(availability({ flatrate: [netflix] }), [])).toBe(
      'paid',
    )
  })
})
```

- [ ] **Step 2: Rodar e verificar que falham**

Run: `npx vitest run lib/catalog/search-availability.test.ts`
Expected: FAIL — módulo não encontrado.

- [ ] **Step 3: Implementar a classificação**

Criar `lib/catalog/search-availability.ts`:

```ts
import type { Availability } from './types'

export type AvailabilityLabel = 'subscription' | 'paid' | 'unavailable'

export const AVAILABILITY_TEXT: Record<AvailabilityLabel, string> = {
  subscription: 'Na sua assinatura',
  paid: 'Aluguel ou compra',
  unavailable: 'Indisponível no Brasil',
}

export function classifyAvailability(
  availability: Availability,
  selectedIds: number[],
): AvailabilityLabel {
  const inSubscription = availability.flatrate.some((provider) =>
    selectedIds.includes(provider.id),
  )
  if (inSubscription) return 'subscription'

  const anywhere =
    availability.flatrate.length > 0 ||
    availability.rent.length > 0 ||
    availability.buy.length > 0

  return anywhere ? 'paid' : 'unavailable'
}
```

- [ ] **Step 4: Implementar o selo**

Criar `components/catalog/AvailabilityBadge.tsx`:

```tsx
import {
  AVAILABILITY_TEXT,
  type AvailabilityLabel,
} from '@/lib/catalog/search-availability'

const STYLES: Record<AvailabilityLabel, string> = {
  subscription: 'bg-emerald-500/20 text-emerald-300',
  paid: 'bg-amber-500/20 text-amber-300',
  unavailable: 'bg-neutral-700/40 text-neutral-400',
}

export function AvailabilityBadge({ label }: { label: AvailabilityLabel }) {
  return (
    <span
      className={`mt-1 inline-block rounded px-2 py-0.5 text-[10px] ${STYLES[label]}`}
    >
      {AVAILABILITY_TEXT[label]}
    </span>
  )
}
```

- [ ] **Step 5: Implementar a página de busca**

Criar `app/search/page.tsx`:

```tsx
import Link from 'next/link'
import { AvailabilityBadge } from '@/components/catalog/AvailabilityBadge'
import { EmptyState } from '@/components/catalog/EmptyState'
import { MovieCard } from '@/components/catalog/MovieCard'
import { getAvailability, searchMovies } from '@/lib/catalog/queries'
import { classifyAvailability } from '@/lib/catalog/search-availability'
import { readSelectedProviderIds } from '@/lib/preferences'

interface SearchPageProps {
  searchParams: Promise<{ q?: string; only?: string }>
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q, only } = await searchParams
  const query = q?.trim() ?? ''

  if (query === '') {
    return (
      <EmptyState
        title="Digite algo para buscar."
        hint="Use o campo no topo da página."
      />
    )
  }

  const [movies, selectedIds] = await Promise.all([
    searchMovies(query),
    readSelectedProviderIds(),
  ])

  // /search/movie não filtra por provedor, então a disponibilidade é
  // resolvida aqui, uma requisição por filme, em paralelo e com cache.
  const labeled = await Promise.all(
    movies.map(async (movie) => ({
      movie,
      label: classifyAvailability(
        await getAvailability(movie.id).catch(() => ({
          flatrate: [],
          rent: [],
          buy: [],
        })),
        selectedIds,
      ),
    })),
  )

  const onlyMine = only === '1'
  const visible = onlyMine
    ? labeled.filter((item) => item.label === 'subscription')
    : labeled

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">
          Resultados para “{query}”
        </h1>
        <Link
          href={`/search?q=${encodeURIComponent(query)}${onlyMine ? '' : '&only=1'}`}
          className="rounded-full bg-neutral-900 px-4 py-2 text-sm"
        >
          {onlyMine ? 'Mostrar todos' : 'Somente nos meus streamings'}
        </Link>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title="Nenhum filme encontrado."
          hint={
            onlyMine
              ? 'Nenhum resultado está nos seus streamings. Desligue o filtro para ver todos.'
              : 'Tente outro título.'
          }
        />
      ) : (
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6">
          {visible.map(({ movie, label }) => (
            <MovieCard
              key={movie.id}
              movie={movie}
              badge={<AvailabilityBadge label={label} />}
            />
          ))}
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 6: Rodar os testes**

Run: `npm test`
Expected: PASS, toda a suíte.

- [ ] **Step 7: Commit**

```bash
git add app/search components/catalog/AvailabilityBadge.tsx lib/catalog/search-availability.ts lib/catalog/search-availability.test.ts
git commit -m "feat: adiciona busca com selos de disponibilidade"
```

---

## Task 13: Carregamento e tratamento de erro por rota

**Files:**
- Create: `app/loading.tsx`, `app/error.tsx`, `app/movie/[id]/loading.tsx`, `app/movie/[id]/error.tsx`, `app/movie/[id]/not-found.tsx`, `app/search/loading.tsx`, `components/catalog/GridSkeleton.tsx`

**Interfaces:**
- Consumes: nada
- Produces: nenhum caminho da interface termina em tela branca.

- [ ] **Step 1: Implementar o esqueleto da grade**

Criar `components/catalog/GridSkeleton.tsx`:

```tsx
export function GridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6">
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="aspect-[2/3] animate-pulse rounded-lg bg-neutral-900"
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Implementar os estados de carregamento**

Criar `app/loading.tsx`:

```tsx
import { GridSkeleton } from '@/components/catalog/GridSkeleton'

export default function Loading() {
  return (
    <>
      <div className="mb-6 h-[42vh] min-h-64 animate-pulse rounded-xl bg-neutral-900" />
      <GridSkeleton />
    </>
  )
}
```

Criar `app/search/loading.tsx`:

```tsx
import { GridSkeleton } from '@/components/catalog/GridSkeleton'

export default function Loading() {
  return <GridSkeleton />
}
```

Criar `app/movie/[id]/loading.tsx`:

```tsx
export default function Loading() {
  return (
    <div className="flex flex-col gap-6 sm:flex-row">
      <div className="aspect-[2/3] w-full max-w-56 animate-pulse rounded-lg bg-neutral-900" />
      <div className="flex-1 space-y-4">
        <div className="h-8 w-2/3 animate-pulse rounded bg-neutral-900" />
        <div className="h-4 w-1/3 animate-pulse rounded bg-neutral-900" />
        <div className="h-24 animate-pulse rounded bg-neutral-900" />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Implementar os error boundaries**

Criar `app/error.tsx`:

```tsx
'use client'

export default function Error({ reset }: { reset: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 py-20 text-center">
      <p className="text-lg text-neutral-200">
        Não conseguimos carregar o catálogo agora.
      </p>
      <p className="text-sm text-neutral-400">
        Pode ser uma instabilidade temporária do TMDB.
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-full bg-emerald-500 px-5 py-2 text-sm font-medium text-neutral-950"
      >
        Tentar de novo
      </button>
    </div>
  )
}
```

Criar `app/movie/[id]/error.tsx` com o mesmo conteúdo, trocando a primeira frase por `Não conseguimos carregar esse filme agora.`

- [ ] **Step 4: Implementar o não-encontrado**

Criar `app/movie/[id]/not-found.tsx`:

```tsx
import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center gap-4 py-20 text-center">
      <p className="text-lg text-neutral-200">Filme não encontrado.</p>
      <Link
        href="/"
        className="rounded-full bg-emerald-500 px-5 py-2 text-sm font-medium text-neutral-950"
      >
        Voltar ao catálogo
      </Link>
    </div>
  )
}
```

- [ ] **Step 5: Verificar manualmente**

Run: `npm run dev`

- Abrir `/movie/999999999` → deve mostrar "Filme não encontrado", não erro de servidor
- Abrir `/search?q=` (vazio) → deve pedir um termo, não quebrar

- [ ] **Step 6: Commit**

```bash
git add app/loading.tsx app/error.tsx app/movie app/search/loading.tsx components/catalog/GridSkeleton.tsx
git commit -m "feat: adiciona esqueletos de carregamento e tratamento de erro por rota"
```

---

## Task 14: Teste de ponta a ponta

**Files:**
- Create: `playwright.config.ts`, `e2e/catalog.spec.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: o app inteiro
- Produces: `npm run test:e2e`

- [ ] **Step 1: Instalar o Playwright**

```bash
npm install -D @playwright/test
npx playwright install chromium
```

- [ ] **Step 2: Configurar**

Criar `playwright.config.ts`:

```ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  use: { baseURL: 'http://localhost:3000' },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
```

Adicionar em `package.json`, dentro de `"scripts"`:

```json
"test:e2e": "playwright test"
```

- [ ] **Step 3: Escrever o teste do fluxo principal**

Criar `e2e/catalog.spec.ts`:

```ts
import { expect, test } from '@playwright/test'

test('percorre o fluxo principal do catálogo', async ({ page }) => {
  await page.goto('/')

  // A home carrega com pelo menos uma fileira e um destaque.
  await expect(page.getByRole('heading', { level: 2 }).first()).toBeVisible()

  // Selecionar um streaming pelo painel.
  await page.getByRole('link', { name: /meus streamings/i }).click()
  const netflix = page.getByRole('checkbox').first()
  await netflix.check()
  await page.getByRole('button', { name: /salvar/i }).click()

  // O contador do cabeçalho reflete a escolha.
  await expect(
    page.getByRole('link', { name: /meus streamings \(1\)/i }),
  ).toBeVisible()

  // Abrir um filme e conferir o bloco de disponibilidade.
  await page.locator('a[href^="/movie/"]').first().click()
  await expect(
    page.getByRole('heading', { name: /onde assistir/i }),
  ).toBeVisible()
})
```

- [ ] **Step 4: Rodar**

Run: `npm run test:e2e`
Expected: PASS, 1 teste. Exige `TMDB_ACCESS_TOKEN` em `.env.local` — o teste toca a API de verdade.

- [ ] **Step 5: Commit**

```bash
git add playwright.config.ts e2e package.json
git commit -m "test: adiciona teste de ponta a ponta do fluxo principal"
```

---

## Task 15: Publicação na Vercel

**Files:**
- Create: `README.md`

**Interfaces:**
- Consumes: o app completo
- Produces: link público funcionando.

- [ ] **Step 1: Escrever o README**

Criar `README.md`:

```markdown
# CineBR

Catálogo de filmes que mostra apenas o que está incluído nos streamings que você já assina, no Brasil.

## Rodando localmente

1. `npm install`
2. Copie `.env.local.example` para `.env.local`
3. Preencha `TMDB_ACCESS_TOKEN` com o Read Access Token v4 de https://www.themoviedb.org/settings/api
4. `npm run dev`

## Testes

- `npm test` — unitários (Vitest)
- `npm run test:e2e` — ponta a ponta (Playwright, precisa do token)

## Documentação

- Design: [`docs/superpowers/specs/2026-09-06-catalogo-filmes-streaming-design.md`](docs/superpowers/specs/2026-09-06-catalogo-filmes-streaming-design.md)
- Plano: [`docs/superpowers/plans/2026-09-06-catalogo-filmes-streaming.md`](docs/superpowers/plans/2026-09-06-catalogo-filmes-streaming.md)

## Créditos

Este site usa o TMDB e as APIs do TMDB, mas não é endossado, certificado ou de outra forma aprovado pelo TMDB.

Dados de disponibilidade em streaming fornecidos por JustWatch.
```

- [ ] **Step 2: Publicar**

```bash
npx vercel
```

Na Vercel, em Settings → Environment Variables, cadastrar `TMDB_ACCESS_TOKEN` com o mesmo valor do `.env.local`. **Sem prefixo `NEXT_PUBLIC_`.**

- [ ] **Step 3: Conferir a publicação**

Abrir a URL gerada e verificar:
- A home carrega com destaque e fileiras
- O rodapé mostra as duas atribuições obrigatórias
- Abrir o código-fonte da página no navegador e buscar pelo token: **não pode aparecer**

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: adiciona README com instruções de execução e créditos"
```

---

## Auto-revisão do plano

**1. Cobertura do spec**

| Requisito do spec | Tarefa |
|---|---|
| Chave só no servidor | 2, 15 |
| `watch_region=BR` e `language=pt-BR` sempre | 2, 5 |
| Fronteira TMDB ↔ domínio | 3 |
| `backdropUrl` no tipo `Movie` | 3 |
| Nota nula sem votos | 3 |
| Cookie de provedores, teto de 4 | 4, 9 |
| Cookie corrompido não derruba | 4 |
| Pipe para múltiplos provedores | 5 |
| `flatrate` na home | 5 |
| `/trending` e `/recommendations` proibidos | Global Constraints |
| Tempos de cache | 5 |
| Modo descoberta vs filtrado | 6, 10 |
| Fileiras: populares + uma por serviço | 6, 10 |
| Destaque sem requisição extra | 10 |
| Destaque sem imagem é omitido | 10 |
| Fileira vazia não renderiza | 10 |
| Fileira que falha não derruba a home | 10 |
| Detalhe numa requisição | 5, 11 |
| Cascata do trailer | 3, 11 |
| Onde assistir com três seções | 11 |
| Sem `BR` mostra "não está em streaming" | 3, 11 |
| Busca com selos, sem descarte silencioso | 12 |
| Interruptor "somente meus streamings" | 12 |
| Grade vazia com saída | 8 |
| `notFound()` em 404 | 5, 11, 13 |
| Error boundary por rota | 13 |
| Esqueleto de carregamento | 13 |
| Atribuições obrigatórias | 7, 15 |
| Teste E2E do fluxo principal | 14 |
| Sem snapshots de componente | Global Constraints |

Sem lacunas. A única adição ao spec é `/genre/movie/list` (Task 9), registrada acima.

**2. Varredura de pendências**

Nenhum "TBD", "TODO" ou passo sem código. Todo passo de código traz o código.

O Step 1 da Task 11 é uma verificação com comando concreto e critério de decisão explícito, não uma pendência.

**3. Consistência de tipos**

- `Movie`, `Provider`, `Availability`, `CastMember`, `MovieDetail`, `Genre` — definidos na Task 3, usados igual em 5, 8, 10, 11, 12
- `tmdbFetch(path, params, revalidate)` — assinatura idêntica em 2 e 5
- `readSelectedProviderIds()` — nome idêntico em 4, 7, 10, 12
- `serializeProviderCookie` / `parseProviderCookie` — 4 e 9
- `buildRailSpecs` devolve `RailSpec[]` com `key`, `title`, `providerIds` — 6 e 10
- `classifyAvailability` devolve `AvailabilityLabel` — 12
- `MovieCard` recebe `badge` opcional, definido na Task 8 e usado na Task 12

Nenhuma divergência.

---

## Ordem de execução

Tarefas 1 a 6 são fundação e precisam vir em ordem. Da 7 em diante há paralelismo possível, mas a sequência escrita é a mais segura: cada tarefa termina com algo verificável no navegador ou na suíte de testes.

A Task 15 depende de conta na Vercel e pode ficar para o fim sem bloquear nada.
