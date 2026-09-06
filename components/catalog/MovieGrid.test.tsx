import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Movie } from '@/lib/catalog/types'
import { MovieGrid } from './MovieGrid'

function movie(overrides: Partial<Movie> = {}): Movie {
  return {
    id: 550,
    title: 'Clube da Luta',
    year: 1999,
    overview: '...',
    posterUrl: 'https://image.tmdb.org/t/p/w500/p.jpg',
    backdropUrl: null,
    rating: 8.4,
    runtimeMinutes: null,
    ...overrides,
  }
}

describe('MovieGrid', () => {
  it('lista os filmes recebidos', () => {
    render(<MovieGrid movies={[movie(), movie({ id: 551, title: 'Seven' })]} />)
    expect(screen.getByText('Clube da Luta')).toBeDefined()
    expect(screen.getByText('Seven')).toBeDefined()
  })

  it('nunca fica em branco: mostra explicação e saída quando vazio', () => {
    render(<MovieGrid movies={[]} />)
    expect(screen.getByText(/nenhum filme/i)).toBeDefined()
    expect(screen.getByRole('link', { name: /limpar filtros/i })).toBeDefined()
  })

  it('mostra o ano quando existe', () => {
    render(<MovieGrid movies={[movie()]} />)
    expect(screen.getByText('1999')).toBeDefined()
  })

  it('não quebra quando o filme não tem ano', () => {
    render(<MovieGrid movies={[movie({ year: null })]} />)
    expect(screen.getByText('Clube da Luta')).toBeDefined()
  })

  it('não quebra quando o filme não tem pôster', () => {
    render(<MovieGrid movies={[movie({ posterUrl: null })]} />)
    expect(screen.getByText('Clube da Luta')).toBeDefined()
  })
})
