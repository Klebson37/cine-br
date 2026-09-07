import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/app/actions', () => ({ setMark: vi.fn() }))

import type { Movie } from '@/lib/catalog/types'
import { MovieGrid } from './MovieGrid'

function filme(id: number): Movie {
  return {
    id,
    title: `Filme ${id}`,
    year: 1999,
    overview: '',
    posterUrl: '/p.jpg',
    backdropUrl: null,
    rating: 8,
    runtimeMinutes: null,
  }
}

describe('MovieGrid', () => {
  it('mostra o estado vazio quando nao ha filmes', () => {
    render(<MovieGrid movies={[]} />)
    expect(screen.queryByRole('link', { name: /Filme/ })).toBeNull()
  })

  it('renderiza um cartao por filme', () => {
    render(<MovieGrid movies={[filme(1), filme(2)]} />)
    expect(screen.getByText('Filme 1')).toBeDefined()
    expect(screen.getByText('Filme 2')).toBeDefined()
  })

  it('nao mostra botao de marcar sem o mapa de marcacoes', () => {
    render(<MovieGrid movies={[filme(1)]} />)
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('mostra o botao de marcar quando recebe o mapa', () => {
    render(
      <MovieGrid movies={[filme(1)]} marks={new Map()} signedIn />,
    )
    expect(screen.getByRole('button', { name: /quero assistir/i })).toBeDefined()
  })

  it('reflete a marcacao existente de cada filme', () => {
    render(
      <MovieGrid
        movies={[filme(1)]}
        marks={new Map([[1, 'watched' as const]])}
        signedIn
      />,
    )
    expect(screen.getByRole('button', { name: /já assisti/i })).toBeDefined()
  })

  it('passa o selo de disponibilidade adiante', () => {
    render(
      <MovieGrid
        movies={[filme(1)]}
        availability={new Map([[1, 'subscription' as const]])}
      />,
    )
    expect(screen.getByText('Na sua assinatura')).toBeDefined()
  })
})
