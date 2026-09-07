import { beforeEach, describe, expect, it, vi } from 'vitest'

const cookieStore = vi.hoisted(() => ({ set: vi.fn(), get: vi.fn() }))
const revalidatePath = vi.hoisted(() => vi.fn())
const redirect = vi.hoisted(() =>
  vi.fn((destino: string) => {
    throw new Error(`REDIRECT:${destino}`)
  }),
)
const createClient = vi.hoisted(() => vi.fn())

vi.mock('next/headers', () => ({ cookies: async () => cookieStore }))
vi.mock('next/cache', () => ({ revalidatePath }))
vi.mock('next/navigation', () => ({ redirect }))
vi.mock('@/lib/supabase/server', () => ({ createClient }))

import { saveProviders, setMark, signOut } from './actions'

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

/** Dublê do encadeamento de escrita: from().upsert() e from().delete().eq() */
function supabaseFake(user: unknown = { id: 'u1' }) {
  const upsert = vi.fn<() => Promise<{ error: { message: string } | null }>>(
    async () => ({ error: null }),
  )
  const eq = vi.fn(() => builderDelete)
  const builderDelete: Record<string, unknown> = { eq }
  const del = vi.fn(() => builderDelete)

  return {
    auth: {
      getUser: vi.fn(async () => ({ data: { user }, error: null })),
      signOut: vi.fn(async () => ({ error: null })),
    },
    from: vi.fn(() => ({ upsert, delete: del })),
    upsert,
    del,
    eq,
  }
}

function formulario(movieId: string, state: string): FormData {
  const form = new FormData()
  form.append('movieId', movieId)
  form.append('state', state)
  return form
}

describe('setMark', () => {
  beforeEach(() => vi.clearAllMocks())

  it('grava a marcacao de quem esta logado', async () => {
    const fake = supabaseFake()
    createClient.mockResolvedValue(fake)

    await setMark(formulario('550', 'want'))

    expect(fake.from).toHaveBeenCalledWith('marks')
    expect(fake.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'u1', movie_id: 550, state: 'want' }),
    )
  })

  it('troca quero assistir por ja assisti sem criar segunda linha', async () => {
    const fake = supabaseFake()
    createClient.mockResolvedValue(fake)

    await setMark(formulario('550', 'watched'))

    expect(fake.upsert).toHaveBeenCalledTimes(1)
    expect(fake.del).not.toHaveBeenCalled()
  })

  it('apaga a linha quando o estado e none', async () => {
    const fake = supabaseFake()
    createClient.mockResolvedValue(fake)

    await setMark(formulario('550', 'none'))

    expect(fake.del).toHaveBeenCalled()
    expect(fake.upsert).not.toHaveBeenCalled()
  })

  it('manda para o login quem nao tem sessao', async () => {
    createClient.mockResolvedValue(supabaseFake(null))

    await expect(setMark(formulario('550', 'want'))).rejects.toThrow(
      'REDIRECT:/auth/login',
    )
  })

  it('recusa movieId que nao e numero, sem tocar no banco', async () => {
    const fake = supabaseFake()
    createClient.mockResolvedValue(fake)

    await setMark(formulario('abc', 'want'))

    expect(fake.upsert).not.toHaveBeenCalled()
    expect(fake.del).not.toHaveBeenCalled()
  })

  it('recusa estado desconhecido', async () => {
    const fake = supabaseFake()
    createClient.mockResolvedValue(fake)

    await setMark(formulario('550', 'favorito'))

    expect(fake.upsert).not.toHaveBeenCalled()
  })

  it('deixa o erro de gravacao subir', async () => {
    const fake = supabaseFake()
    fake.upsert.mockResolvedValue({ error: { message: 'sem permissao' } })
    createClient.mockResolvedValue(fake)

    await expect(setMark(formulario('550', 'want'))).rejects.toThrow(
      /sem permissao/,
    )
  })
})

describe('signOut', () => {
  beforeEach(() => vi.clearAllMocks())

  it('encerra a sessao e volta para a home', async () => {
    const fake = supabaseFake()
    createClient.mockResolvedValue(fake)

    await expect(signOut()).rejects.toThrow('REDIRECT:/')
    expect(fake.auth.signOut).toHaveBeenCalled()
  })
})
