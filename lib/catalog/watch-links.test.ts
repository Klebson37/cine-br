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

describe('watchHref — os tres niveis', () => {
  it('o Plex usa query, nao q: com q ele responde 200 e ignora a busca', () => {
    const url = watchHref(538, 'Plex', 'Metropolis', TMDB)
    expect(url).toContain('query=Metropolis')
    expect(url).not.toContain('?q=')
  })

  it('o Plex Channel vai para a mesma casa do Plex', () => {
    expect(watchHref(2077, 'Plex Channel', 'Metropolis', TMDB)).toBe(
      watchHref(538, 'Plex', 'Metropolis', TMDB),
    )
  })

  it('servico sem busca por endereco vai para a propria casa, nao ao TMDB', () => {
    // Era isto que mandava quem clicava em "Mercado Play" para o TMDB.
    const url = watchHref(2302, 'Mercado Play', 'Homem-Aranha', TMDB)
    expect(url).toContain('mercadolivre')
    expect(url).not.toContain('themoviedb')
  })

  it('nenhum servico gratuito conhecido cai no TMDB', () => {
    const gratuitos: [number, string][] = [
      [300, 'Pluto TV'],
      [2302, 'Mercado Play'],
      [538, 'Plex'],
      [2077, 'Plex Channel'],
      [19, 'NetMovies'],
      [559, 'Filmzie'],
      [2623, 'Artiflix'],
      [692, 'Cultpix'],
      [2478, 'FOUND TV'],
      [544, 'Libreflix'],
      [2285, 'JustWatch TV'],
    ]
    for (const [id, nome] of gratuitos) {
      const url = watchHref(id, nome, 'Metropolis', TMDB)
      expect(url, nome).not.toBe(TMDB)
      expect(url, nome).not.toContain('themoviedb.org')
    }
  })

  it('a busca vence a casa quando o servico tem as duas', () => {
    // O Plex esta so na busca; o Disney+ so na casa. Nenhum nos dois.
    expect(watchHref(538, 'Plex', 'X', TMDB)).toContain('watch.plex.tv')
    expect(watchHref(337, 'Disney Plus', 'X', TMDB)).toContain('disneyplus.com')
  })

  it('o TMDB sobra so para quem nao esta em mapa nenhum', () => {
    expect(watchHref(999999, 'Serviço Novo', 'X', TMDB)).toBe(TMDB)
  })
})
