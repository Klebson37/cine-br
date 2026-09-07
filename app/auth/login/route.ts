import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/** Monta a URL do Google no servidor e manda a pessoa para lá.
 *
 *  Feito assim, e não com um cliente de navegador, para o login não exigir
 *  JavaScript — a mesma razão pela qual a barra de filtros é um GET puro. */
export async function GET(request: Request): Promise<never> {
  const origem = new URL(request.url).origin
  const supabase = await createClient()

  const { data } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${origem}/auth/callback` },
  })

  redirect(data?.url ?? '/')
}
