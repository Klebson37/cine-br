import { describe, expect, it } from 'vitest'
import { resolveHomeMode } from './home-mode'

describe('resolveHomeMode', () => {
  it('é descoberta quando não há nenhum filtro', () => {
    expect(resolveHomeMode({})).toBe('discovery')
  })

  it('é filtrado quando há gênero', () => {
    expect(resolveHomeMode({ genre: '27' })).toBe('filtered')
  })

  it('é filtrado quando há ordenação', () => {
    expect(resolveHomeMode({ sort: 'vote_average.desc' })).toBe('filtered')
  })

  it('ignora parâmetros presentes porém vazios', () => {
    expect(resolveHomeMode({ genre: '', sort: '' })).toBe('discovery')
  })

  it('ignora espaços em branco', () => {
    expect(resolveHomeMode({ genre: '   ' })).toBe('discovery')
  })

  it('é filtrado quando há gênero e ordenação juntos', () => {
    expect(resolveHomeMode({ genre: '27', sort: 'title.asc' })).toBe('filtered')
  })

  it('continua em descoberta quando só a nota mínima foi escolhida', () => {
    expect(resolveHomeMode({ rating: '8' })).toBe('discovery')
  })

  it('vai para a grade quando a nota vem junto de gênero', () => {
    expect(resolveHomeMode({ rating: '8', genre: '27' })).toBe('filtered')
  })

  it('vai para a grade quando a nota vem junto de ordenação', () => {
    expect(resolveHomeMode({ rating: '8', sort: 'title.asc' })).toBe('filtered')
  })
})
