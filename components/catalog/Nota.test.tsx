import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Nota } from './Nota'

describe('Nota', () => {
  it('mostra a nota com virgula decimal', () => {
    const { container } = render(<Nota rating={6.74} />)
    expect(container.textContent).toContain('6,7')
  })

  it('some quando o filme nunca foi votado', () => {
    const { container } = render(<Nota rating={null} />)
    expect(container.innerHTML).toBe('')
  })

  it('diz "Nota" para quem le a tela, ja que a estrela e decorativa', () => {
    render(<Nota rating={8.2} />)
    expect(screen.getByText('Nota')).toBeDefined()
  })

  it('a variante de destaque mostra a escala', () => {
    const { container } = render(<Nota rating={8.2} variant="destaque" />)
    expect(container.textContent).toContain('8,2')
    expect(container.textContent).toContain('/10')
  })

  it('a variante do cartaz nao gasta espaco com a escala', () => {
    const { container } = render(<Nota rating={8.2} />)
    expect(container.textContent).not.toContain('/10')
  })
})
