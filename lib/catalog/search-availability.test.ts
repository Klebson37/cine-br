import { describe, expect, it } from 'vitest'
import { classifyAvailability } from './search-availability'
import type { Availability } from './types'

const netflix = { id: 8, name: 'Netflix', logoUrl: null }
const max = { id: 384, name: 'Max', logoUrl: null }
const appleTv = { id: 2, name: 'Apple TV', logoUrl: null }

function availability(overrides: Partial<Availability> = {}): Availability {
  return { flatrate: [], rent: [], buy: [], link: null, ...overrides }
}

describe('classifyAvailability', () => {
  it('é "na assinatura" quando está num serviço marcado', () => {
    expect(
      classifyAvailability(availability({ flatrate: [netflix] }), [8]),
    ).toBe('subscription')
  })

  it('é "pago" quando está em streaming, porém não num serviço marcado', () => {
    expect(classifyAvailability(availability({ flatrate: [max] }), [8])).toBe(
      'paid',
    )
  })

  it('é "pago" quando só existe aluguel', () => {
    expect(classifyAvailability(availability({ rent: [appleTv] }), [8])).toBe(
      'paid',
    )
  })

  it('é "indisponível" quando não há nada no Brasil', () => {
    expect(classifyAvailability(availability(), [8])).toBe('unavailable')
  })

  it('sem serviços marcados, assinatura ainda conta como paga', () => {
    expect(classifyAvailability(availability({ flatrate: [netflix] }), [])).toBe(
      'paid',
    )
  })
})
