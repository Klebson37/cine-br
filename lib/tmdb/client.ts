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
