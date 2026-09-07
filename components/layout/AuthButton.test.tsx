import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/app/actions', () => ({ signOut: vi.fn() }))

import { AuthButton } from './AuthButton'

describe('AuthButton', () => {
  it('convida a entrar quem nao tem sessao', () => {
    render(<AuthButton user={null} />)
    const link = screen.getByRole('link', { name: /entrar/i })
    expect(link.getAttribute('href')).toBe('/auth/login')
  })

  it('mostra o primeiro nome de quem esta logado', () => {
    render(<AuthButton user={{ id: 'u1', name: 'Ana Souza' }} />)
    expect(screen.getByText('Ana')).toBeDefined()
  })

  it('oferece sair para quem esta logado', () => {
    render(<AuthButton user={{ id: 'u1', name: 'Ana Souza' }} />)
    expect(screen.getByRole('button', { name: /sair/i })).toBeDefined()
  })

  it('nao oferece entrar para quem ja entrou', () => {
    render(<AuthButton user={{ id: 'u1', name: 'Ana Souza' }} />)
    expect(screen.queryByRole('link', { name: /entrar/i })).toBeNull()
  })

  it('aguenta usuario sem nome vindo do google', () => {
    render(<AuthButton user={{ id: 'u1', name: '' }} />)
    expect(screen.getByRole('button', { name: /sair/i })).toBeDefined()
  })
})
