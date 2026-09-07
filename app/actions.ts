'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import {
  COOKIE_MAX_AGE_SECONDS,
  PROVIDERS_COOKIE,
  serializeProviderCookie,
} from '@/lib/preferences'
import { MARKS_TABLE } from '@/lib/marks/queries'
import { parseMarkState } from '@/lib/marks/types'
import { createClient } from '@/lib/supabase/server'

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
  // Sai do painel depois de salvar: a URL carrega ?providers=open, e sem
  // isto a pessoa salva e continua olhando o mesmo formulário, sem sinal
  // de que deu certo.
  redirect('/')
}

/**
 * Marca um filme como "quero assistir" ou "já assisti", ou tira a marca.
 *
 * Não chama revalidatePath de propósito: todas as rotas do app são dinâmicas
 * e getMarks consulta o banco a cada renderização, então a marcação nova
 * aparece sozinha. Chamar revalidatePath aqui purgaria também o cache de uma
 * hora das consultas ao TMDB daquela rota — caro, e sem ganho.
 */
export async function setMark(formData: FormData): Promise<void> {
  const movieId = Number.parseInt(String(formData.get('movieId') ?? ''), 10)
  if (!Number.isInteger(movieId) || movieId <= 0) return

  const bruto = String(formData.get('state') ?? '')
  const state = parseMarkState(bruto)
  // 'none' é o único valor aceito fora dos dois estados: significa desmarcar.
  if (state === null && bruto !== 'none') return

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Sem sessão, convida a entrar em vez de falhar em silêncio.
  if (!user) redirect('/auth/login')

  const { error } =
    state === null
      ? await supabase
          .from(MARKS_TABLE)
          .delete()
          .eq('user_id', user.id)
          .eq('movie_id', movieId)
      : await supabase.from(MARKS_TABLE).upsert({
          user_id: user.id,
          movie_id: movieId,
          state,
          updated_at: new Date().toISOString(),
        })

  // Gravação que falha em silêncio é pior que erro visível: a pessoa acha
  // que marcou e descobre depois que não marcou.
  if (error) throw new Error(error.message)
}

export async function signOut(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/')
}
