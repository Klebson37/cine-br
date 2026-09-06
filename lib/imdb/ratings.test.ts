import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { encodeRatingsIndex } from './format'
import {
  getImdbRating,
  loadRatingsIndex,
  resetRatingsIndexCache,
} from './ratings'

// Arquivos de verdade em vez de mock de node:fs: o mock não alcança os
// módulos importados pelo teste, e ler do disco é o comportamento que
// interessa verificar aqui.
const PASTA = mkdtempSync(path.join(tmpdir(), 'cinebr-ratings-'))
const ARQUIVO = path.join(PASTA, 'imdb-ratings.bin')
const AUSENTE = path.join(PASTA, 'nao-existe.bin')

writeFileSync(
  ARQUIVO,
  encodeRatingsIndex([
    { id: 111161, rating: 9.3 },
    { id: 68646, rating: 9.2 },
  ]),
)

afterAll(() => rmSync(PASTA, { recursive: true, force: true }))

describe('loadRatingsIndex', () => {
  beforeEach(() => resetRatingsIndexCache())

  it('lê o índice do disco', () => {
    const indice = loadRatingsIndex(ARQUIVO)
    expect(indice.ids.length).toBe(2)
  })

  it('devolve o mesmo índice nas chamadas seguintes, sem reler', () => {
    expect(loadRatingsIndex(ARQUIVO)).toBe(loadRatingsIndex(ARQUIVO))
  })

  it('explica como gerar o índice quando o arquivo não existe', () => {
    expect(() => loadRatingsIndex(AUSENTE)).toThrow(/build:imdb/)
  })

  it('nomeia o arquivo que faltou', () => {
    expect(() => loadRatingsIndex(AUSENTE)).toThrow(/nao-existe\.bin/)
  })

  it('não guarda em cache uma leitura que falhou', () => {
    expect(() => loadRatingsIndex(AUSENTE)).toThrow()
    expect(loadRatingsIndex(ARQUIVO).ids.length).toBe(2)
  })

  it('recusa um arquivo corrompido', () => {
    const quebrado = path.join(PASTA, 'quebrado.bin')
    writeFileSync(quebrado, new Uint8Array([9, 0, 0, 0, 1, 2]))
    expect(() => loadRatingsIndex(quebrado)).toThrow(/corrompido/i)
  })
})

describe('getImdbRating', () => {
  beforeEach(() => {
    resetRatingsIndexCache()
    // Aquece o cache com o arquivo de teste: getImdbRating não recebe caminho.
    loadRatingsIndex(ARQUIVO)
  })

  it('devolve a nota do título presente no índice', () => {
    expect(getImdbRating('tt0111161')).toBeCloseTo(9.3)
  })

  it('devolve null para título ausente', () => {
    expect(getImdbRating('tt9999999')).toBeNull()
  })

  it('devolve null para tconst malformado', () => {
    expect(getImdbRating('lixo')).toBeNull()
  })
})
