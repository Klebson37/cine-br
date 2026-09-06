import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Availability } from '@/lib/catalog/types'
import { WhereToWatch } from './WhereToWatch'

const netflix = { id: 8, name: 'Netflix', logoUrl: null }
const appleTv = { id: 2, name: 'Apple TV', logoUrl: null }

function availability(overrides: Partial<Availability> = {}): Availability {
  return { flatrate: [], rent: [], buy: [], ...overrides }
}

describe('WhereToWatch', () => {
  it('destaca o que está incluído na assinatura', () => {
    render(<WhereToWatch availability={availability({ flatrate: [netflix] })} />)
    expect(screen.getByText(/incluído na sua assinatura/i)).toBeDefined()
    expect(screen.getByText('Netflix')).toBeDefined()
  })

  it('separa aluguel de assinatura', () => {
    render(
      <WhereToWatch
        availability={availability({ flatrate: [netflix], rent: [appleTv] })}
      />,
    )
    expect(screen.getByText(/aluguel/i)).toBeDefined()
    expect(screen.getByText('Apple TV')).toBeDefined()
  })

  it('não mostra seções vazias', () => {
    render(<WhereToWatch availability={availability({ flatrate: [netflix] })} />)
    expect(screen.queryByText(/^aluguel$/i)).toBeNull()
    expect(screen.queryByText(/^compra$/i)).toBeNull()
  })

  it('diz claramente quando o filme não está em nenhum streaming no Brasil', () => {
    render(<WhereToWatch availability={availability()} />)
    expect(
      screen.getByText(/não está em nenhum streaming no brasil/i),
    ).toBeDefined()
  })
})
