import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type OpcoesClienteServidor = {
  cookies: {
    getAll: () => { name: string; value: string }[]
    setAll: (
      paraGravar: Array<{
        name: string
        value: string
        options: Record<string, unknown>
      }>,
    ) => void
  }
}

const cookieStore = vi.hoisted(() => ({
  getAll: vi.fn(() => [{ name: 'sb-token', value: 'abc' }]),
  set: vi.fn(),
}))
const createServerClient = vi.hoisted(() =>
  vi.fn<(url: string, chave: string, opcoes: OpcoesClienteServidor) => { marcador: boolean }>(
    () => ({ marcador: true }),
  ),
)

vi.mock('next/headers', () => ({ cookies: async () => cookieStore }))
vi.mock('@supabase/ssr', () => ({ createServerClient }))

import { createClient } from './server'

const URL_ANTERIOR = process.env.NEXT_PUBLIC_SUPABASE_URL
const CHAVE_ANTERIOR = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

describe('createClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://exemplo.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'chave-anonima'
  })

  afterEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = URL_ANTERIOR
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = CHAVE_ANTERIOR
  })

  it('monta o cliente com a url e a chave do ambiente', async () => {
    await createClient()
    const [url, chave] = createServerClient.mock.calls[0]
    expect(url).toBe('https://exemplo.supabase.co')
    expect(chave).toBe('chave-anonima')
  })

  it('entrega os cookies da requisicao ao cliente', async () => {
    await createClient()
    const [, , opcoes] = createServerClient.mock.calls[0]
    expect(opcoes.cookies.getAll()).toEqual([
      { name: 'sb-token', value: 'abc' },
    ])
  })

  it('grava os cookies que o supabase devolve', async () => {
    await createClient()
    const [, , opcoes] = createServerClient.mock.calls[0]
    opcoes.cookies.setAll([
      { name: 'sb-token', value: 'novo', options: { path: '/' } },
    ])
    expect(cookieStore.set).toHaveBeenCalledWith('sb-token', 'novo', {
      path: '/',
    })
  })

  it('engole o erro de gravar cookie em Server Component', async () => {
    cookieStore.set.mockImplementationOnce(() => {
      throw new Error('Cookies can only be modified in a Server Action')
    })
    await createClient()
    const [, , opcoes] = createServerClient.mock.calls[0]
    expect(() =>
      opcoes.cookies.setAll([{ name: 'a', value: 'b', options: {} }]),
    ).not.toThrow()
  })

  it('explica o que fazer quando falta a configuracao', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    await expect(createClient()).rejects.toThrow(/NEXT_PUBLIC_SUPABASE_URL/)
  })
})
