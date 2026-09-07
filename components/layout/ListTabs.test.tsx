import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ListTabs } from './ListTabs'

describe('ListTabs', () => {
  it('mostra as tres abas', () => {
    render(<ListTabs active="discover" />)
    expect(screen.getByRole('link', { name: 'Descobrir' })).toBeDefined()
    expect(screen.getByRole('link', { name: 'Quero assistir' })).toBeDefined()
    expect(screen.getByRole('link', { name: 'Já assisti' })).toBeDefined()
  })

  it('aponta cada aba para a rota certa', () => {
    render(<ListTabs active="discover" />)
    expect(
      screen.getByRole('link', { name: 'Descobrir' }).getAttribute('href'),
    ).toBe('/')
    expect(
      screen.getByRole('link', { name: 'Quero assistir' }).getAttribute('href'),
    ).toBe('/quero-assistir')
    expect(
      screen.getByRole('link', { name: 'Já assisti' }).getAttribute('href'),
    ).toBe('/assisti')
  })

  it('marca a aba ativa para leitores de tela', () => {
    render(<ListTabs active="want" />)
    expect(
      screen
        .getByRole('link', { name: 'Quero assistir' })
        .getAttribute('aria-current'),
    ).toBe('page')
  })

  it('marca apenas uma aba como ativa', () => {
    render(<ListTabs active="watched" />)
    const marcadas = screen
      .getAllByRole('link')
      .filter((link) => link.getAttribute('aria-current') === 'page')
    expect(marcadas).toHaveLength(1)
  })

  it('e uma navegacao nomeada', () => {
    render(<ListTabs active="discover" />)
    expect(screen.getByRole('navigation', { name: /listas/i })).toBeDefined()
  })
})
