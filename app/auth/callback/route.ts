import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/** O Google devolve um código de uso único; aqui ele vira sessão em cookie.
 *  Precisa ser Route Handler, e não Server Component, porque só aqui o Next
 *  permite gravar cookie. */
export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      return NextResponse.redirect(`${url.origin}/?erro=login`)
    }
  }

  return NextResponse.redirect(url.origin)
}
