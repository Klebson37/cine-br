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
