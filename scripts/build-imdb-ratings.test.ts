import { describe, expect, it } from 'vitest'
import { MIN_VOTES, parseTsv } from './build-imdb-ratings.mts'

const CABECALHO = 'tconst\taverageRating\tnumVotes'

function tsv(...linhas: string[]): string {
  return [CABECALHO, ...linhas].join('\n')
}

describe('parseTsv', () => {
  it('ignora a linha de cabeçalho', () => {
    expect(parseTsv(tsv())).toEqual([])
  })

  it('converte tconst e nota das linhas que passam o corte', () => {
    const entradas = parseTsv(tsv('tt0111161\t9.3\t2900000'))
    expect(entradas).toEqual([{ id: 111161, rating: 9.3 }])
  })

  it('descarta títulos abaixo do corte de votos', () => {
    const entradas = parseTsv(
      tsv('tt0111161\t9.3\t2900000', `tt9999999\t9.9\t${MIN_VOTES - 1}`),
    )
    expect(entradas).toEqual([{ id: 111161, rating: 9.3 }])
  })

  it('mantém o título que empata exatamente com o corte', () => {
    const entradas = parseTsv(tsv(`tt0111161\t9.3\t${MIN_VOTES}`))
    expect(entradas).toHaveLength(1)
  })

  it('descarta linhas com tconst malformado', () => {
    expect(parseTsv(tsv('nm0000138\t9.3\t2900000'))).toEqual([])
  })

  it('descarta linhas com nota não numérica', () => {
    expect(parseTsv(tsv('tt0111161\t\\N\t2900000'))).toEqual([])
  })

  it('tolera linha vazia no fim do arquivo', () => {
    const entradas = parseTsv(`${tsv('tt0111161\t9.3\t2900000')}\n`)
    expect(entradas).toHaveLength(1)
  })

  it('tolera terminação de linha do Windows', () => {
    const entradas = parseTsv(`${CABECALHO}\r\ntt0111161\t9.3\t2900000\r\n`)
    expect(entradas).toEqual([{ id: 111161, rating: 9.3 }])
  })
})
