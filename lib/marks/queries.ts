import { createClient } from '@/lib/supabase/server'
import type { MarkState } from './types'

export const MARKS_TABLE = 'marks'

export interface CurrentUser {
  id: string
  name: string
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return null

    const metadata = user.user_metadata as { full_name?: string } | null
    return { id: user.id, name: metadata?.full_name ?? '' }
  } catch {
    return null
  }
}

/**
 * Todas as marcações da pessoa, indexadas pelo id do filme.
 *
 * Traz o conjunto inteiro, e não só os filmes da tela: são dezenas ou
 * centenas de linhas por pessoa, e filtrar por uma lista de ids sairia mais
 * caro em complexidade do que economizaria em tráfego.
 *
 * Falha vira mapa vazio. Estas marcações são decorativas — pintam botões
 * sobre um catálogo que existe sem elas — e derrubar a home porque o banco
 * piscou seria desproporcional.
 */
export async function getMarks(): Promise<Map<number, MarkState>> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return new Map()

    const { data, error } = await supabase
      .from(MARKS_TABLE)
      .select('movie_id, state')

    if (error || !data) return new Map()

    return new Map(
      data.map((linha) => [
        linha.movie_id as number,
        linha.state as MarkState,
      ]),
    )
  } catch {
    return new Map()
  }
}

/**
 * Os ids de um estado, mais recentes primeiro.
 *
 * Ao contrário de getMarks, este **deixa o erro subir**: ele é o conteúdo da
 * página de lista, e devolver vazio diria "você não marcou nada" quando a
 * verdade é "não consegui perguntar".
 */
export async function listMarkedIds(state: MarkState): Promise<number[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from(MARKS_TABLE)
    .select('movie_id')
    .eq('state', state)
    .order('updated_at', { ascending: false })

  if (error) throw new Error(error.message)

  return (data ?? []).map((linha) => linha.movie_id as number)
}
