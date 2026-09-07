import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Availability } from '@/lib/catalog/types'
import { WhereToWatch } from './WhereToWatch'

const netflix = { id: 8, name: 'Netflix', logoUrl: null }
const appleTv = { id: 2, name: 'Apple TV', logoUrl: null }

function availability(overrides: Partial<Availability> = {}): Availability {
  return { flatrate: [], free: [], rent: [], buy: [], link: null, ...overrides }
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

describe('WhereToWatch com os serviços do usuário', () => {
  it('só chama de "sua" a assinatura que ele de fato tem', () => {
    render(
      <WhereToWatch
        availability={availability({ flatrate: [netflix, appleTv] })}
        selectedIds={[netflix.id]}
      />,
    )
    expect(screen.getByText(/incluído na sua assinatura/i)).toBeDefined()
    expect(
      screen.getByText(/em assinaturas que você não tem/i),
    ).toBeDefined()
  })

  it('não promete assinatura própria quando nenhuma delas é dele', () => {
    render(
      <WhereToWatch
        availability={availability({ flatrate: [appleTv] })}
        selectedIds={[netflix.id]}
      />,
    )
    expect(screen.queryByText(/incluído na sua assinatura/i)).toBeNull()
    expect(
      screen.getByText(/em assinaturas que você não tem/i),
    ).toBeDefined()
  })
})

describe('WhereToWatch — o caminho ate o filme', () => {
  it('o servico vira link que abre a busca dele com o titulo', () => {
    render(
      <WhereToWatch
        availability={availability({ flatrate: [netflix] })}
        title="O Império da Paixão"
      />,
    )
    const link = screen.getByRole('link', { name: /assistir em netflix/i })
    expect(link.getAttribute('href')).toContain('netflix.com/search')
    expect(link.getAttribute('href')).toContain('Imp')
  })

  it('abre em outra aba, sem entregar a janela ao destino', () => {
    render(
      <WhereToWatch
        availability={availability({ flatrate: [netflix] })}
        title="Matrix"
      />,
    )
    const link = screen.getByRole('link', { name: /assistir em netflix/i })
    expect(link.getAttribute('target')).toBe('_blank')
    expect(link.getAttribute('rel')).toContain('noopener')
  })

  it('servico fora do mapa cai na pagina do titulo no TMDB', () => {
    const desconhecido = { id: 999999, name: 'Serviço X', logoUrl: null }
    render(
      <WhereToWatch
        availability={availability({
          flatrate: [desconhecido],
          link: 'https://www.themoviedb.org/movie/1/watch?locale=BR',
        })}
        title="Matrix"
      />,
    )
    expect(
      screen
        .getByRole('link', { name: /assistir em serviço x/i })
        .getAttribute('href'),
    ).toContain('themoviedb.org')
  })

  it('sem titulo o selo continua selo, e nao vira link quebrado', () => {
    render(<WhereToWatch availability={availability({ flatrate: [netflix] })} />)
    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.getByText('Netflix')).toBeDefined()
  })

  it('sem mapa e sem reserva, tambem nao inventa link', () => {
    const desconhecido = { id: 999999, name: 'Serviço X', logoUrl: null }
    render(
      <WhereToWatch
        availability={availability({ flatrate: [desconhecido] })}
        title="Matrix"
      />,
    )
    expect(screen.queryByRole('link')).toBeNull()
  })
})
