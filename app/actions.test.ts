import { beforeEach, describe, expect, it, vi } from 'vitest'

const cookieStore = vi.hoisted(() => ({ set: vi.fn(), get: vi.fn() }))
const revalidatePath = vi.hoisted(() => vi.fn())

vi.mock('next/headers', () => ({ cookies: async () => cookieStore }))
vi.mock('next/cache', () => ({ revalidatePath }))

import { saveProviders } from './actions'

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
