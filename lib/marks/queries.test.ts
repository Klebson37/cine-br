import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const createClient = vi.hoisted(() => vi.fn())

vi.mock('@/lib/supabase/server', () => ({ createClient }))

import { getCurrentUser, getMarks, listMarkedIds } from './queries'

/** Dublê do encadeamento do supabase-js: from().select().eq().order() */
function supabaseFake({
  user = { id: 'u1', user_metadata: { full_name: 'Ana Souza' } } as unknown,
  rows = [] as unknown[] | null,
  error = null as unknown,
}) {
  const builder: Record<string, unknown> = {}
  builder.select = vi.fn(() => builder)
  builder.eq = vi.fn(() => builder)
  builder.order = vi.fn(() => Promise.resolve({ data: rows, error }))
  builder.then = (resolve: (v: unknown) => unknown) =>
    resolve({ data: rows, error })

  return {
    auth: { getUser: vi.fn(async () => ({ data: { user }, error: null })) },
    from: vi.fn(() => builder),
    builder,
  }
}

describe('getCurrentUser', () => {
  afterEach(() => vi.clearAllMocks())

  it('devolve id e nome de quem esta logado', async () => {
    createClient.mockResolvedValue(supabaseFake({}))
    expect(await getCurrentUser()).toEqual({ id: 'u1', name: 'Ana Souza' })
  })

  it('devolve null sem sessao', async () => {
    createClient.mockResolvedValue(supabaseFake({ user: null }))
    expect(await getCurrentUser()).toBeNull()
  })

  it('cai para o primeiro nome vazio quando o google nao mandou nome', async () => {
    createClient.mockResolvedValue(
      supabaseFake({ user: { id: 'u1', user_metadata: {} } }),
    )
    expect((await getCurrentUser())?.name).toBe('')
  })
})

describe('getMarks', () => {
  afterEach(() => vi.clearAllMocks())

  it('devolve mapa vazio sem sessao, sem consultar a tabela', async () => {
    const fake = supabaseFake({ user: null })
    createClient.mockResolvedValue(fake)

    const marks = await getMarks()

    expect(marks.size).toBe(0)
    expect(fake.from).not.toHaveBeenCalled()
  })

  it('indexa as marcacoes pelo id do filme', async () => {
    createClient.mockResolvedValue(
      supabaseFake({
        rows: [
          { movie_id: 550, state: 'want' },
          { movie_id: 278, state: 'watched' },
        ],
      }),
    )

    const marks = await getMarks()

    expect(marks.get(550)).toBe('want')
    expect(marks.get(278)).toBe('watched')
  })

  it('degrada para mapa vazio quando a consulta falha', async () => {
    createClient.mockResolvedValue(
      supabaseFake({ rows: null, error: { message: 'fora do ar' } }),
    )
    expect((await getMarks()).size).toBe(0)
  })

  it('degrada para mapa vazio quando o cliente nem monta', async () => {
    createClient.mockRejectedValue(new Error('sem configuracao'))
    expect((await getMarks()).size).toBe(0)
  })
})

describe('listMarkedIds', () => {
  beforeEach(() => vi.clearAllMocks())

  it('devolve os ids do estado pedido', async () => {
    createClient.mockResolvedValue(
      supabaseFake({ rows: [{ movie_id: 550 }, { movie_id: 278 }] }),
    )
    expect(await listMarkedIds('want')).toEqual([550, 278])
  })

  it('filtra pelo estado e ordena por mais recente', async () => {
    const fake = supabaseFake({ rows: [] })
    createClient.mockResolvedValue(fake)

    await listMarkedIds('watched')

    expect(fake.builder.eq).toHaveBeenCalledWith('state', 'watched')
    expect(fake.builder.order).toHaveBeenCalledWith('updated_at', {
      ascending: false,
    })
  })

  it('devolve lista vazia sem sessao', async () => {
    createClient.mockResolvedValue(supabaseFake({ user: null }))
    expect(await listMarkedIds('want')).toEqual([])
  })

  it('deixa o erro subir: e o conteudo da pagina, nao enfeite', async () => {
    createClient.mockResolvedValue(
      supabaseFake({ rows: null, error: { message: 'fora do ar' } }),
    )
    await expect(listMarkedIds('want')).rejects.toThrow(/fora do ar/)
  })
})
