import { describe, expect, it } from 'vitest'
import { MARK_LABEL, nextMarkState, parseMarkState } from './types'

describe('parseMarkState', () => {
  it('aceita os dois estados validos', () => {
    expect(parseMarkState('want')).toBe('want')
    expect(parseMarkState('watched')).toBe('watched')
  })

  it('devolve null para ausencia', () => {
    expect(parseMarkState(undefined)).toBeNull()
    expect(parseMarkState('')).toBeNull()
  })

  it('devolve null para qualquer outra coisa', () => {
    expect(parseMarkState('none')).toBeNull()
    expect(parseMarkState('WANT')).toBeNull()
    expect(parseMarkState('favorito')).toBeNull()
  })
})

describe('MARK_LABEL', () => {
  it('nomeia os estados em portugues', () => {
    expect(MARK_LABEL.want).toBe('Quero assistir')
    expect(MARK_LABEL.watched).toBe('Já assisti')
  })
})

describe('nextMarkState', () => {
  it('sem marca vira quero assistir', () => {
    expect(nextMarkState(null)).toBe('want')
  })

  it('quero assistir vira ja assisti', () => {
    expect(nextMarkState('want')).toBe('watched')
  })

  it('ja assisti volta para sem marca', () => {
    expect(nextMarkState('watched')).toBe('none')
  })

  it('fecha o ciclo em tres cliques', () => {
    const passos = [nextMarkState(null), nextMarkState('want'), nextMarkState('watched')]
    expect(passos).toEqual(['want', 'watched', 'none'])
  })
})
