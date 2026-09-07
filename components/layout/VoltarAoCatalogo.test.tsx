import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { VoltarAoCatalogo } from './VoltarAoCatalogo'

describe('VoltarAoCatalogo', () => {
  it('leva para a home', () => {
    render(<VoltarAoCatalogo />)
    expect(
      screen.getByRole('link', { name: /voltar ao catálogo/i }).getAttribute('href'),
    ).toBe('/')
  })

  it('diz o destino em texto, nao so na seta', () => {
    render(<VoltarAoCatalogo />)
    expect(screen.getByRole('link').textContent).toMatch(/voltar ao catálogo/i)
  })

  it('aceita classes de posicionamento de quem usa', () => {
    render(<VoltarAoCatalogo className="mb-4" />)
    expect(screen.getByRole('link').className).toMatch(/mb-4/)
  })
})
