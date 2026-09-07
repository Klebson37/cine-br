import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { GettingStarted } from './GettingStarted'

describe('GettingStarted', () => {
  it('explica a premissa do site antes dos passos', () => {
    render(<GettingStarted />)
    expect(screen.getByText(/só vê filmes já incluídos/i)).toBeDefined()
  })

  it('apresenta os tres passos na ordem', () => {
    render(<GettingStarted />)
    const passos = screen.getAllByRole('listitem')
    expect(passos).toHaveLength(3)
    expect(passos[0].textContent).toMatch(/escolha seus streamings/i)
    expect(passos[1].textContent).toMatch(/bem avaliado no imdb/i)
    expect(passos[2].textContent).toMatch(/marcar o que quer assistir/i)
  })

  it('o primeiro passo abre o painel de streamings', () => {
    render(<GettingStarted />)
    expect(
      screen
        .getByRole('link', { name: /escolha seus streamings/i })
        .getAttribute('href'),
    ).toBe('/?providers=open')
  })

  it('o terceiro passo leva ao login', () => {
    render(<GettingStarted />)
    expect(
      screen.getByRole('link', { name: /entre com o google/i }).getAttribute('href'),
    ).toBe('/auth/login')
  })

  it('e uma secao nomeada, para leitor de tela', () => {
    render(<GettingStarted />)
    expect(screen.getByRole('region', { name: /como usar/i })).toBeDefined()
  })
})
