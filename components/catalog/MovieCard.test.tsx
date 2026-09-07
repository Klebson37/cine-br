import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Movie } from '@/lib/catalog/types'
import { MovieCard } from './MovieCard'

const FILME: Movie = {
  id: 550,
  title: 'Clube da Luta',
  year: 1999,
  overview: '',
  posterUrl: 'https://image.tmdb.org/t/p/w500/p.jpg',
  backdropUrl: null,
  rating: 8.4,
  runtimeMinutes: null,
}

describe('MovieCard', () => {
  it('leva para a pagina do filme', () => {
    render(<MovieCard movie={FILME} />)
    expect(screen.getByRole('link').getAttribute('href')).toBe('/movie/550')
  })

  it('mostra titulo e ano', () => {
    render(<MovieCard movie={FILME} />)
    expect(screen.getByText('Clube da Luta')).toBeDefined()
    expect(screen.getByText('1999')).toBeDefined()
  })

  it('renderiza a acao recebida', () => {
    render(<MovieCard movie={FILME} action={<button>Marcar</button>} />)
    expect(screen.getByRole('button', { name: 'Marcar' })).toBeDefined()
  })

  it('mantem a acao FORA do link', () => {
    // Um form ou button dentro de um <a> e HTML invalido: o navegador
    // desmonta a arvore e o clique em "marcar" navega para o filme junto.
    render(<MovieCard movie={FILME} action={<button>Marcar</button>} />)
    const link = screen.getByRole('link')
    const botao = screen.getByRole('button', { name: 'Marcar' })
    expect(link.contains(botao)).toBe(false)
  })

  it('nao renderiza nada de acao quando nenhuma foi passada', () => {
    render(<MovieCard movie={FILME} />)
    expect(screen.queryByRole('button')).toBeNull()
  })
})
