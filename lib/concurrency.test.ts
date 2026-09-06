import { describe, expect, it } from 'vitest'
import { mapWithConcurrency } from './concurrency'

function adiado<T>(valor: T, ms: number): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(valor), ms))
}

describe('mapWithConcurrency', () => {
  it('preserva a ordem do resultado mesmo com durações embaralhadas', async () => {
    const resultado = await mapWithConcurrency([30, 10, 20], 3, (ms) =>
      adiado(ms, ms),
    )
    expect(resultado).toEqual([30, 10, 20])
  })

  it('nunca passa do limite de promessas vivas', async () => {
    let vivas = 0
    let pico = 0

    await mapWithConcurrency(
      Array.from({ length: 20 }, (_, i) => i),
      4,
      async (i) => {
        vivas++
        pico = Math.max(pico, vivas)
        await adiado(i, 1)
        vivas--
        return i
      },
    )

    expect(pico).toBe(4)
  })

  it('processa todos os itens quando há mais itens que o limite', async () => {
    const resultado = await mapWithConcurrency(
      Array.from({ length: 25 }, (_, i) => i),
      8,
      async (i) => i * 2,
    )
    expect(resultado).toHaveLength(25)
    expect(resultado[24]).toBe(48)
  })

  it('repassa o índice para a função', async () => {
    const resultado = await mapWithConcurrency(
      ['a', 'b'],
      2,
      async (item, i) => `${i}:${item}`,
    )
    expect(resultado).toEqual(['0:a', '1:b'])
  })

  it('devolve lista vazia sem chamar a função', async () => {
    let chamadas = 0
    const resultado = await mapWithConcurrency([], 8, async () => chamadas++)
    expect(resultado).toEqual([])
    expect(chamadas).toBe(0)
  })

  it('não cria mais trabalhadores que itens', async () => {
    const resultado = await mapWithConcurrency([1], 8, async (n) => n + 1)
    expect(resultado).toEqual([2])
  })
})
