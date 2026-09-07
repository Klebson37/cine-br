import { describe, expect, it } from 'vitest'
import { watchHref } from './watch-links'

const TMDB = 'https://www.themoviedb.org/movie/603/watch?locale=BR'

describe('watchHref', () => {
  it('leva ao servico ja procurando o titulo', () => {
    expect(watchHref(8, 'Netflix', 'Matrix', TMDB)).toBe(
      'https://www.netflix.com/search?q=Matrix',
    )
  })

  it('escapa titulo com espaco e acento', () => {
    const url = watchHref(8, 'Netflix', 'O Imperio da Paixao', TMDB)
    expect(url).toContain('O%20Imperio')
    expect(url).not.toContain(' ')
  })

  it('canal dentro do Prime vai para o Prime, nao para a marca do canal', () => {
    // "HBO Max Amazon Channel" se assiste no Prime. Mandar para o Max
    // levaria a pessoa a um servico que ela pode nem assinar.
    const url = watchHref(0, 'HBO Max Amazon Channel', 'Matrix', TMDB)
    expect(url).toContain('primevideo.com')
    expect(url).not.toContain('max.com')
  })

  it('a familia Amazon inteira cai no Prime sem precisar de id', () => {
    for (const nome of [
      'Amazon Prime Video with Ads',
      'Telecine Amazon Channel',
      'Paramount+ Amazon Channel',
    ]) {
      expect(watchHref(0, nome, 'Matrix', TMDB)).toContain('primevideo.com')
    }
  })

  it('o id vence o nome quando os dois casam', () => {
    // 1899 e o HBO Max de verdade, nao um canal dentro do Prime.
    expect(watchHref(1899, 'HBO Max', 'Matrix', TMDB)).toContain('play.max.com')
  })

  it('servico fora das duas camadas cai na pagina do TMDB', () => {
    expect(watchHref(999999, 'Servico X', 'Matrix', TMDB)).toBe(TMDB)
  })

  it('sem reserva e sem correspondencia, nao inventa link quebrado', () => {
    expect(watchHref(999999, 'Servico X', 'Matrix', null)).toBeNull()
  })
})
