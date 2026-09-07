import { describe, expect, it } from 'vitest'
import {
  describeSelection,
  formatRating,
  formatRatingShort,
  formatRuntime,
  initials,
} from './format'

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

describe('initials', () => {
  it('usa a primeira e a última palavra do nome', () => {
    expect(initials('Alfonso Herrera')).toBe('AH')
  })

  it('ignora os nomes do meio', () => {
    expect(initials('Juan Pablo Cruz García')).toBe('JG')
  })

  it('devolve uma letra só para nome único', () => {
    expect(initials('Cher')).toBe('C')
  })

  it('mantém acentos maiúsculos', () => {
    expect(initials(' Álex Pera')).toBe('ÁP')
  })

  it('tolera espaços extras e string vazia', () => {
    expect(initials('  Noé   Hernández  ')).toBe('NH')
    expect(initials('')).toBe('')
  })
})

describe('formatRatingShort', () => {
  it('usa vírgula decimal, sem o "de 10"', () => {
    expect(formatRatingShort(8.4)).toBe('8,4')
  })

  it('mantém uma casa mesmo em nota redonda', () => {
    expect(formatRatingShort(9)).toBe('9,0')
  })

  it('devolve null quando não há nota', () => {
    expect(formatRatingShort(null)).toBeNull()
  })
})
