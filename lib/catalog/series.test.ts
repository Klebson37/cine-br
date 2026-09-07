import { describe, expect, it } from 'vitest'
import { FILMES, SERIES } from './media'
import { toSeries } from './mappers'

const CRUA = {
  id: 1399,
  name: 'A Guerra dos Tronos',
  overview: 'Sinopse.',
  poster_path: '/p.jpg',
  backdrop_path: '/b.jpg',
  first_air_date: '2011-04-17',
  vote_average: 8.4,
  vote_count: 22000,
  episode_run_time: [60, 45],
}

describe('toSeries', () => {
  it('usa name como titulo, porque serie no TMDB nao tem title', () => {
    expect(toSeries(CRUA).title).toBe('A Guerra dos Tronos')
  })

  it('tira o ano da primeira exibicao', () => {
    expect(toSeries(CRUA).year).toBe(2011)
  })

  it('serie sem data de estreia fica sem ano, nao com ano errado', () => {
    expect(toSeries({ ...CRUA, first_air_date: undefined }).year).toBeNull()
  })

  it('a duracao e a do episodio, que e o que ajuda a decidir', () => {
    expect(toSeries(CRUA).runtimeMinutes).toBe(60)
  })

  it('serie sem duracao declarada nao inventa uma', () => {
    expect(
      toSeries({ ...CRUA, episode_run_time: undefined }).runtimeMinutes,
    ).toBeNull()
  })

  it('serie nunca votada nao tem nota — zero seria lido como nota ruim', () => {
    expect(toSeries({ ...CRUA, vote_count: 0 }).rating).toBeNull()
  })

  it('monta as urls de imagem como as dos filmes', () => {
    const serie = toSeries(CRUA)
    expect(serie.posterUrl).toBe('https://image.tmdb.org/t/p/w500/p.jpg')
    expect(serie.backdropUrl).toBe('https://image.tmdb.org/t/p/w1280/b.jpg')
  })
})

describe('as duas secoes do catalogo', () => {
  it('levam a rotas diferentes, porque os ids sao numeracoes separadas', () => {
    expect(FILMES.item).toBe('/movie')
    expect(SERIES.item).toBe('/series')
    expect(FILMES.item).not.toBe(SERIES.item)
  })

  it('a secao de filmes e a home', () => {
    expect(FILMES.lista).toBe('/')
  })

  it('cada uma diz ao TMDB qual catalogo consultar', () => {
    expect(FILMES.kind).toBe('movie')
    expect(SERIES.kind).toBe('tv')
  })
})
