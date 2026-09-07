import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FilterBar } from './FilterBar'

const GENEROS = [
  { id: 27, name: 'Terror' },
  { id: 35, name: 'Comédia' },
]

function faixa(nome: string): HTMLAnchorElement {
  return screen.getByRole('link', { name: new RegExp(nome) }) as HTMLAnchorElement
}

describe('FilterBar — faixas de nota', () => {
  it('oferece Todos mais as quatro faixas', () => {
    render(<FilterBar genres={GENEROS} />)
    const links = screen.getAllByRole('link')
    expect(links.map((l) => l.textContent)).toEqual([
      'Todos',
      '★6+',
      '★7+',
      '★8+',
      '★9+',
    ])
  })

  it('marca Todos como ativo quando não há filtro', () => {
    render(<FilterBar genres={GENEROS} />)
    expect(faixa('Todos').getAttribute('aria-current')).toBe('page')
  })

  it('marca apenas a faixa ativa', () => {
    render(<FilterBar genres={GENEROS} activeRating={8} />)
    const marcadas = screen
      .getAllByRole('link')
      .filter((l) => l.getAttribute('aria-current') === 'page')
    expect(marcadas).toHaveLength(1)
    expect(marcadas[0].textContent).toBe('★8+')
  })

  it('cada faixa aponta para a home com a nota na url', () => {
    render(<FilterBar genres={GENEROS} />)
    expect(faixa('8\\+').getAttribute('href')).toBe('/?rating=8')
  })

  it('Todos limpa a nota sem perder os outros filtros', () => {
    render(
      <FilterBar genres={GENEROS} activeGenre="27" activeSort="title.asc" activeRating={8} />,
    )
    expect(faixa('Todos').getAttribute('href')).toBe('/?genre=27&sort=title.asc')
  })

  it('trocar de faixa preserva genero e ordenacao', () => {
    render(
      <FilterBar genres={GENEROS} activeGenre="27" activeSort="title.asc" activeRating={7} />,
    )
    expect(faixa('9\\+').getAttribute('href')).toBe(
      '/?genre=27&sort=title.asc&rating=9',
    )
  })

  it('e uma navegacao nomeada, para leitor de tela', () => {
    render(<FilterBar genres={GENEROS} />)
    expect(screen.getByRole('navigation', { name: /nota/i })).toBeDefined()
  })
})

describe('FilterBar — genero e ordenacao', () => {
  it('mantem os dois seletores funcionando', () => {
    render(<FilterBar genres={GENEROS} activeGenre="27" activeSort="title.asc" />)
    expect((screen.getByLabelText('Gênero') as HTMLSelectElement).value).toBe('27')
    expect(
      (screen.getByLabelText('Ordenar por') as HTMLSelectElement).value,
    ).toBe('title.asc')
  })

  it('leva a nota ativa junto ao enviar o formulario', () => {
    const { container } = render(<FilterBar genres={GENEROS} activeRating={8} />)
    const oculto = container.querySelector(
      'input[name="rating"]',
    ) as HTMLInputElement | null
    expect(oculto?.value).toBe('8')
  })

  it('nao envia campo de nota quando nenhuma faixa esta ativa', () => {
    const { container } = render(<FilterBar genres={GENEROS} />)
    expect(container.querySelector('input[name="rating"]')).toBeNull()
  })

  it('continua sendo um formulario GET para a home, sem JavaScript', () => {
    const { container } = render(<FilterBar genres={GENEROS} />)
    expect(container.querySelector('form')?.getAttribute('action')).toBe('/')
  })
})
