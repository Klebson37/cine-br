import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FilterBar } from './FilterBar'

const GENEROS = [
  { id: 27, name: 'Terror' },
  { id: 35, name: 'Comédia' },
]

function seletorDeNota(): HTMLSelectElement {
  return screen.getByLabelText('Nota mínima') as HTMLSelectElement
}

describe('FilterBar', () => {
  it('oferece as quatro faixas de nota mais a opção sem filtro', () => {
    render(<FilterBar genres={GENEROS} />)
    const opcoes = Array.from(seletorDeNota().options, (o) => o.textContent)
    expect(opcoes).toEqual([
      'Qualquer nota',
      'Nota 6 ou mais',
      'Nota 7 ou mais',
      'Nota 8 ou mais',
      'Nota 9 ou mais',
    ])
  })

  it('envia o campo com o nome rating', () => {
    render(<FilterBar genres={GENEROS} />)
    expect(seletorDeNota().name).toBe('rating')
  })

  it('deixa "Qualquer nota" marcada quando não há filtro ativo', () => {
    render(<FilterBar genres={GENEROS} />)
    expect(seletorDeNota().value).toBe('')
  })

  it('marca a faixa ativa quando ela vem da URL', () => {
    render(<FilterBar genres={GENEROS} activeRating={8} />)
    expect(seletorDeNota().value).toBe('8')
  })

  it('mantém gênero e ordenação funcionando ao lado da nota', () => {
    render(
      <FilterBar genres={GENEROS} activeGenre="27" activeSort="title.asc" />,
    )
    expect((screen.getByLabelText('Gênero') as HTMLSelectElement).value).toBe(
      '27',
    )
    expect(
      (screen.getByLabelText('Ordenar por') as HTMLSelectElement).value,
    ).toBe('title.asc')
  })

  it('continua sendo um formulário GET para a home, sem JavaScript', () => {
    const { container } = render(<FilterBar genres={GENEROS} />)
    const form = container.querySelector('form')
    expect(form?.getAttribute('action')).toBe('/')
  })
})
