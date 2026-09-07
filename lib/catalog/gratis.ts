/** Os serviços que não cobram assinatura.
 *
 *  Não existe endpoint "provedores grátis" no TMDB: a informação vive por
 *  título, nas chaves `free` e `ads` da disponibilidade. Esta lista saiu de
 *  uma varredura dos filmes brasileiros com essas duas monetizações, e é o
 *  que o painel usa para dizer "Grátis" ao lado do nome — porque marcar um
 *  serviço sem saber que ele é gratuito esconde justamente a melhor notícia
 *  que o app tem a dar.
 *
 *  Ela é curta e pode envelhecer. Se um serviço novo aparecer, o catálogo
 *  continua funcionando: o que ele perde é só o selo, não os filmes. */
export const SERVICOS_GRATIS: ReadonlySet<number> = new Set([
  300, // Pluto TV
  2302, // Mercado Play
  538, // Plex
  2077, // Plex Channel
  544, // Libreflix
  2285, // JustWatch TV
  19, // NetMovies
  2555, // Bloodstream
  2478, // FOUND TV
])

export function ehGratis(providerId: number): boolean {
  return SERVICOS_GRATIS.has(providerId)
}

/** As monetizações que o catálogo aceita.
 *
 *  A premissa do site é "sem descobrir o preço depois de se interessar", e
 *  grátis com anúncio cumpre isso tão bem quanto assinatura — o que fica de
 *  fora é aluguel e compra, que cobram por título. Sem `free` e `ads` aqui,
 *  marcar o Pluto TV no painel devolveria uma prateleira vazia: medido, o
 *  JustWatch TV vai de 387 filmes para 1.746 quando os dois entram. */
export const MONETIZACAO_INCLUIDA = 'flatrate|free|ads'
