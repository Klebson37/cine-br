import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/** Cliente do Supabase para uso no servidor.
 *
 *  A sessao vive em cookie porque Server Components precisam le-la para
 *  renderizar — nao ha como guarda-la so na memoria do navegador. */
export async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const chave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !chave) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY nao estao configurados. Copie .env.local.example para .env.local e preencha.',
    )
  }

  const cookieStore = await cookies()

  return createServerClient(url, chave, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (paraGravar) => {
        try {
          for (const { name, value, options } of paraGravar) {
            cookieStore.set(name, value, options)
          }
        } catch {
          // Server Component nao pode gravar cookie, e o Next lanca aqui.
          // A renovacao da sessao acontece nos Route Handlers e Server
          // Actions, onde a gravacao e permitida — engolir aqui e o
          // comportamento previsto pela biblioteca, nao uma falha.
        }
      },
    },
  })
}
