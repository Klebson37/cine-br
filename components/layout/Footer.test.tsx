import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Footer } from './Footer'

describe('Footer', () => {
  it('exibe o aviso de não-endosso exigido pelo TMDB', () => {
    render(<Footer />)
    expect(
      screen.getByText(
        /não é endossado, certificado ou de outra forma aprovado pelo TMDB/i,
      ),
    ).toBeDefined()
  })

  it('credita o JustWatch pelos dados de disponibilidade', () => {
    render(<Footer />)
    expect(screen.getByText(/JustWatch/i)).toBeDefined()
  })
})
