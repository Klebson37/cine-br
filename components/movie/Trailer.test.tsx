import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Trailer } from './Trailer'

describe('Trailer', () => {
  it('embute o player do YouTube com a chave recebida', () => {
    render(<Trailer youtubeKey="abc123" />)
    const iframe = screen.getByTitle('Trailer') as HTMLIFrameElement
    expect(iframe.src).toContain('youtube.com/embed/abc123')
  })

  it('some por completo quando não há vídeo, sem moldura vazia', () => {
    const { container } = render(<Trailer youtubeKey={null} />)
    expect(container.firstChild).toBeNull()
  })
})
