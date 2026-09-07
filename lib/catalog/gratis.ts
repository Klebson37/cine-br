/** Os serviços que não cobram assinatura.
 *
 *  Não existe endpoint "provedores grátis" no TMDB: a informação vive por
 *  título, nas chaves `free` e `ads` da disponibilidade. Esta lista saiu de
 *  uma varredura de cem filmes brasileiros com essas duas monetizações,
 *  cruzada com a lista de provedores do país, e cada tamanho de catálogo foi
 *  medido com uma consulta própria.
 *
 *  Ela pode envelhecer. Se um serviço novo aparecer, o catálogo continua
 *  funcionando: o que ele perde é o selo e a fileira, não os filmes — a
 *  consulta pede `free` e `ads` de qualquer provedor. */

export interface ServicoGratis {
  id: number
  nome: string
  /** Quantos filmes tinha na medição. Serve só para ordenar as fileiras:
   *  quem tem mais catálogo aparece antes, porque tem mais a oferecer. */
  acervo: number
}

/** Ordenados pelo tamanho do acervo, medido em outubro de 2026. */
export const SERVICOS_GRATIS_LISTA: readonly ServicoGratis[] = [
  { id: 538, nome: 'Plex', acervo: 12036 },
  { id: 19, nome: 'NetMovies', acervo: 3004 },
  { id: 559, nome: 'Filmzie', acervo: 2559 },
  { id: 2285, nome: 'JustWatch TV', acervo: 1746 },
  { id: 2302, nome: 'Mercado Play', acervo: 1650 },
  { id: 300, nome: 'Pluto TV', acervo: 1619 },
  { id: 2623, nome: 'Artiflix', acervo: 712 },
  { id: 2555, nome: 'Bloodstream', acervo: 704 },
  { id: 1875, nome: 'Runtime', acervo: 552 },
  { id: 2478, nome: 'FOUND TV', acervo: 325 },
  { id: 692, nome: 'Cultpix', acervo: 220 },
  { id: 544, nome: 'Libreflix', acervo: 100 },
]

/** O Plex Channel é a mesma prateleira do Plex sob outro nome — 11.926
 *  contra 12.036. Fica fora das fileiras, para a página não repetir o mesmo
 *  acervo duas vezes, mas continua valendo como serviço gratuito no painel
 *  e no selo. */
const PLEX_CHANNEL = 2077

export const SERVICOS_GRATIS: ReadonlySet<number> = new Set([
  ...SERVICOS_GRATIS_LISTA.map((s) => s.id),
  PLEX_CHANNEL,
])

export function ehGratis(providerId: number): boolean {
  return SERVICOS_GRATIS.has(providerId)
}

/** Todos os ids gratuitos numa consulta só, no formato de OU do TMDB. */
export const IDS_GRATIS = [...SERVICOS_GRATIS].join('|')

/** As monetizações que o catálogo aceita.
 *
 *  A premissa do site é "sem descobrir o preço depois de se interessar", e
 *  grátis com anúncio cumpre isso tão bem quanto assinatura — o que fica de
 *  fora é aluguel e compra, que cobram por título. Sem `free` e `ads` aqui,
 *  marcar o Pluto TV no painel devolveria uma prateleira vazia: medido, o
 *  JustWatch TV vai de 387 filmes para 1.746 quando os dois entram. */
export const MONETIZACAO_INCLUIDA = 'flatrate|free|ads'

/** Só o que não cobra nada. A seção Grátis usa esta, e não a de cima: ali
 *  um filme de assinatura seria exatamente a promessa quebrada que o nome
 *  da seção proíbe. */
export const MONETIZACAO_SEM_CUSTO = 'free|ads'
