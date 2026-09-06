import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Movie } from '@/lib/catalog/types'
import { FeaturedMovie } from './FeaturedMovie'

function movie(overrides: Partial<Movie> = {}): Movie {
  return {
    id: 550,
    title: 'Clube da Luta',
    year: 1999,
    overview: 'Um homem insone conhece um vendedor de sabonetes.',
    posterUrl: 'https://image.tmdb.org/t/p/w500/p.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/b.jpg',
    rating: 8.4,
    runtimeMinutes: null,
    ...overrides,
  }
}

describe('FeaturedMovie', () => {
  it('mostra título, ano e sinopse', () => {
    render(<FeaturedMovie movie={movie()} />)
    expect(screen.getByText('Clube da Luta')).toBeDefined()
    expect(screen.getByText(/1999/)).toBeDefined()
    expect(screen.getByText(/vendedor de sabonetes/)).toBeDefined()
  })

  it('não renderiza nada quando não há filme', () => {
    const { container } = render(<FeaturedMovie movie={undefined} />)
    expect(container.firstChild).toBeNull()
  })

  it('cai para o pôster quando não há imagem panorâmica', () => {
    render(<FeaturedMovie movie={movie({ backdropUrl: null })} />)
    expect(screen.getByText('Clube da Luta')).toBeDefined()
  })

  it('não renderiza nada quando falta imagem panorâmica e pôster', () => {
    const { container } = render(
      <FeaturedMovie movie={movie({ backdropUrl: null, posterUrl: null })} />,
    )
    expect(container.firstChild).toBeNull()
  })
})
