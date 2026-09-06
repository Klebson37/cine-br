import { cookies } from 'next/headers'
import { PROVIDERS_COOKIE, parseProviderCookie } from './preferences'

/** A leitura do cookie mora aqui, e não em preferences.ts, porque aquele
 *  módulo também é importado pelo painel de streamings, que roda no
 *  cliente: um import de next/headers lá derruba o build inteiro. */
export async function readSelectedProviderIds(): Promise<number[]> {
  const store = await cookies()
  return parseProviderCookie(store.get(PROVIDERS_COOKIE)?.value)
}
