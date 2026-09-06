import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Movie } from '@/lib/catalog/types'
import { MovieRail } from './MovieRail'

function movie(id: number): Movie {
  return {
    id,
    title: `Filme ${id}`,
    year: 2020,
    overview: '',
    posterUrl: 'https://image.tmdb.org/t/p/w500/p.jpg',
    backdropUrl: null,
    rating: 7,
    runtimeMinutes: null,
  }
}

describe('MovieRail', () => {
  it('mostra o título e os filmes', () => {
    render(<MovieRail title="Na Netflix" movies={[movie(1), movie(2)]} />)
    expect(screen.getByText('Na Netflix')).toBeDefined()
    expect(screen.getByText('Filme 1')).toBeDefined()
  })

  it('some por completo quando não há filmes, título incluído', () => {
    const { container } = render(<MovieRail title="Na Netflix" movies={[]} />)
    expect(container.firstChild).toBeNull()
    expect(screen.queryByText('Na Netflix')).toBeNull()
  })
})
