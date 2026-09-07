/** Para onde vai quem clica num serviço em "Onde assistir" ou no botão
 *  Assistir.
 *
 *  Nenhuma API pública entrega o endereço do filme dentro de cada serviço:
 *  isso exigiria o id interno que cada um usa, e o TMDB não o tem. O mais
 *  perto que dá é a busca do próprio serviço, já com o título digitado.
 *
 *  Daí os três níveis, do melhor para o pior:
 *
 *  1. BUSCA — endereço que aplica mesmo a consulta. Cada um foi aberto num
 *     navegador de verdade e conferido: o título procurado tem de aparecer
 *     na página. Só entra aqui o que passou nesse teste.
 *  2. CASA — a porta do serviço, quando a busca dele não aceita consulta por
 *     endereço. Não abre o filme, mas abre o lugar certo, e a pessoa digita
 *     uma vez. É muito melhor que despachá-la para um catálogo de terceiros.
 *  3. A página do título no TMDB, só para serviço que não conheço.
 *
 *  Código HTTP 200 não serve de prova aqui: quase todos são aplicações de
 *  página única e devolvem 200 para qualquer rota, inclusive inventada. Foi
 *  assim que o Plex entrou no ar com `?q=` — respondia 200 e ignorava a
 *  busca. O parâmetro certo é `query`, e o Plex é o maior acervo gratuito
 *  do catálogo, com doze mil filmes. */

type Busca = (tituloCodificado: string) => string

const PRIME: Busca = (t) => `https://www.primevideo.com/search?phrase=${t}`
const APPLE: Busca = (t) => `https://tv.apple.com/search?term=${t}`
const MAX: Busca = (t) => `https://play.max.com/search?q=${t}`
const PLEX: Busca = (t) => `https://watch.plex.tv/search?query=${t}`

/** Nível 1: a consulta chega na página. Conferido em navegador. */
const BUSCA_POR_ID: Record<number, Busca> = {
  8: (t) => `https://www.netflix.com/search?q=${t}`,
  119: PRIME,
  350: APPLE,
  2: APPLE,
  1899: MAX,
  538: PLEX,
  2077: PLEX,
  2285: (t) => `https://www.justwatch.com/br/busca?q=${t}`,
  167: (t) => `https://www.clarotvmais.com.br/busca?q=${t}`,
  484: (t) => `https://www.clarotvmais.com.br/busca?q=${t}`,
  47: (t) => `https://www.looke.com.br/busca?q=${t}`,
  531: (t) => `https://www.paramountplus.com/br/search/?q=${t}`,
  307: (t) => `https://globoplay.globo.com/busca/?q=${t}`,
  283: (t) => `https://www.crunchyroll.com/pt-br/search?q=${t}`,
  11: (t) => `https://mubi.com/pt/br/search/films?query=${t}`,
  10: (t) => `https://www.amazon.com.br/s?k=${t}&i=instant-video`,
  3: (t) => `https://play.google.com/store/search?q=${t}&c=movies`,
}

/** Nível 2: a porta do serviço.
 *
 *  Estes ou não aceitam consulta por endereço, ou aceitam e ignoram — o
 *  Pluto TV carrega a página de busca e deixa a caixa vazia; o Filmzie e o
 *  FOUND TV devolvem a home sob qualquer parâmetro; o Mercado Play barra
 *  robô e não dá para conferir de fora. Levar a pessoa até a casa certa e
 *  deixá-la digitar é honesto; prometer a busca e entregar outra coisa,
 *  não. */
const CASA_POR_ID: Record<number, string> = {
  300: 'https://pluto.tv/br/search',
  2302: 'https://play.mercadolivre.com.br',
  19: 'https://www.netmovies.com.br',
  559: 'https://www.filmzie.com',
  2623: 'https://www.artiflix.com',
  692: 'https://www.cultpix.com',
  2478: 'https://foundtv.com',
  544: 'https://libreflix.org',
  // Disney+ exige sessão e devolve 404 em todo caminho de busca aberto.
  337: 'https://www.disneyplus.com/pt-br',
}

/** A ordem importa: o primeiro padrão que casar vence. "Amazon Channel" vem
 *  antes de qualquer outro porque "HBO Max Amazon Channel" se assiste no
 *  Prime, não no Max — mandar para o Max levaria a pessoa a um serviço que
 *  ela pode não assinar. */
const POR_NOME: [RegExp, Busca][] = [
  [/amazon channel/i, PRIME],
  [/prime video|^amazon video/i, PRIME],
  [/apple tv/i, APPLE],
  [/hbo|^max$/i, MAX],
  [/^plex/i, PLEX],
]

/**
 * O endereço para onde o selo de um serviço leva.
 *
 * `reserva` é o link do próprio título no TMDB, que a API devolve junto da
 * disponibilidade. É o último recurso, e existe só para serviço que não está
 * em nenhum dos dois mapas. Sem ele e sem correspondência, devolve null — e
 * aí o selo continua sendo selo, em vez de virar um link quebrado.
 */
export function watchHref(
  providerId: number,
  providerName: string,
  titulo: string,
  reserva: string | null,
): string | null {
  const codificado = encodeURIComponent(titulo)

  const busca = BUSCA_POR_ID[providerId]
  if (busca) return busca(codificado)

  for (const [padrao, porNome] of POR_NOME) {
    if (padrao.test(providerName)) return porNome(codificado)
  }

  const casa = CASA_POR_ID[providerId]
  if (casa) return casa

  return reserva
}
