import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/app/actions', () => ({ setMark: vi.fn() }))

import { MarkButton } from './MarkButton'

function campoOculto(nome: string): HTMLInputElement | null {
  return document.querySelector(`input[name="${nome}"]`)
}

describe('MarkButton na forma cartao', () => {
  it('sem marca, o clique pede quero assistir', () => {
    render(<MarkButton movieId={550} current={null} signedIn />)
    expect(campoOculto('state')?.value).toBe('want')
    expect(campoOculto('movieId')?.value).toBe('550')
  })

  it('em quero assistir, o clique passa para ja assisti', () => {
    render(<MarkButton movieId={550} current="want" signedIn />)
    expect(campoOculto('state')?.value).toBe('watched')
  })

  it('em ja assisti, o clique desmarca', () => {
    render(<MarkButton movieId={550} current="watched" signedIn />)
    expect(campoOculto('state')?.value).toBe('none')
  })

  it('anuncia o estado atual para leitores de tela', () => {
    render(<MarkButton movieId={550} current="want" signedIn />)
    expect(screen.getByRole('button').getAttribute('aria-pressed')).toBe('true')
  })

  it('quem nao entrou recebe um link para o login, nao um formulario', () => {
    render(<MarkButton movieId={550} current={null} signedIn={false} />)
    expect(screen.getByRole('link').getAttribute('href')).toBe('/auth/login')
    expect(screen.queryByRole('button')).toBeNull()
  })
})

describe('MarkButton na forma detalhe', () => {
  it('mostra os dois estados como botoes separados', () => {
    render(
      <MarkButton movieId={550} current={null} signedIn variant="detail" />,
    )
    expect(screen.getByRole('button', { name: /quero assistir/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /já assisti/i })).toBeDefined()
  })

  it('clicar no estado ja ativo desmarca', () => {
    render(
      <MarkButton movieId={550} current="want" signedIn variant="detail" />,
    )
    const estados = Array.from(
      document.querySelectorAll('input[name="state"]'),
    ).map((campo) => (campo as HTMLInputElement).value)
    expect(estados).toEqual(['none', 'watched'])
  })

  it('quem nao entrou recebe links para o login', () => {
    render(
      <MarkButton
        movieId={550}
        current={null}
        signedIn={false}
        variant="detail"
      />,
    )
    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(2)
    expect(links[0].getAttribute('href')).toBe('/auth/login')
  })
})
