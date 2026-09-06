import { describe, expect, it } from 'vitest'
import { describeSelection, formatRating, formatRuntime } from './format'

describe('formatRating', () => {
  it('usa vírgula decimal', () => {
    expect(formatRating(8.4)).toBe('8,4 de 10')
  })

  it('devolve null quando nunca foi votado', () => {
    expect(formatRating(null)).toBeNull()
  })
})

describe('formatRuntime', () => {
  it('escreve horas e minutos como as pessoas falam', () => {
    expect(formatRuntime(142)).toBe('2h22')
  })

  it('omite os minutos na hora cheia', () => {
    expect(formatRuntime(120)).toBe('2h')
  })

  it('fica em minutos abaixo de uma hora', () => {
    expect(formatRuntime(45)).toBe('45 min')
  })

  it('trata ausência e duração inválida como ausência', () => {
    expect(formatRuntime(null)).toBeNull()
    expect(formatRuntime(0)).toBeNull()
  })
})

describe('describeSelection', () => {
  it('muda de frase conforme o número de serviços', () => {
    expect(describeSelection(0)).toMatch(/streamings do Brasil/)
    expect(describeSelection(1)).toMatch(/no streaming que você assina/)
    expect(describeSelection(4)).toMatch(/seus 4 streamings/)
  })
})
