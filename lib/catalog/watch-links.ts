/** Para onde vai quem clica num serviço em "Onde assistir".
 *
 *  O TMDB não entrega link direto por serviço. O que ele dá é um endereço
 *  por título — uma página dele mesmo, listando as opções daquele país. Útil
 *  como rede de segurança, mas mandar a pessoa para outro catálogo quando
 *  ela quer assistir é um passo a mais no caminho errado.
 *
 *  Então cada serviço grande do Brasil tem aqui o endereço de busca dele.
 *  Tocar em "Netflix" abre a Netflix já procurando o título — no celular, o
 *  próprio aplicativo, porque esses endereços são links universais. Não é o
 *  play direto, que exigiria licença de distribuição do detentor dos
 *  direitos, mas é um toque até o filme dentro do serviço que a pessoa paga.
 *
 *  São duas camadas de propósito. O id é exato, mas o TMDB tem dezenas de
 *  "canais" que são vitrines dentro de outro serviço — HBO Max Amazon
 *  Channel, Telecine Amazon Channel, Paramount+ Amazon Channel — e catalogar
 *  o id de cada um envelheceria a cada canal novo. O nome resolve a família
 *  inteira de uma vez. Quem escapar das duas cai na página do TMDB, que
 *  lista todas as opções: pior que o ideal, melhor que um selo morto. */

type Busca = (tituloCodificado: string) => string

const PRIME: Busca = (t) => `https://www.primevideo.com/search?phrase=${t}`
const APPLE: Busca = (t) => `https://tv.apple.com/search?term=${t}`
const MAX: Busca = (t) => `https://play.max.com/search?q=${t}`

/** Ids conferidos contra /watch/providers/movie?watch_region=BR. */
const POR_ID: Record<number, Busca> = {
  8: (t) => `https://www.netflix.com/search?q=${t}`,
  119: PRIME,
  350: APPLE,
  337: (t) => `https://www.disneyplus.com/pt-br/search?q=${t}`,
  2285: (t) => `https://www.justwatch.com/br/busca?q=${t}`,
  167: (t) => `https://www.clarotvmais.com.br/busca?q=${t}`,
  484: (t) => `https://www.clarotvmais.com.br/busca?q=${t}`,
  47: (t) => `https://www.looke.com.br/busca?q=${t}`,
  531: (t) => `https://www.paramountplus.com/br/search/?q=${t}`,
  1899: MAX,
  2: APPLE,
  307: (t) => `https://globoplay.globo.com/busca/?q=${t}`,
  283: (t) => `https://www.crunchyroll.com/pt-br/search?q=${t}`,
  11: (t) => `https://mubi.com/pt/br/search/films?query=${t}`,
  10: (t) => `https://www.amazon.com.br/s?k=${t}&i=instant-video`,
  3: (t) => `https://play.google.com/store/search?q=${t}&c=movies`,
  19: (t) => `https://www.netmovies.com.br/busca?q=${t}`,
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
]

/**
 * O endereço para onde o selo de um serviço leva.
 *
 * `reserva` é o link do próprio título no TMDB, que a API devolve junto da
 * disponibilidade. Vale para os serviços fora das duas camadas e para quando
 * o TMDB não manda nada — aí não há para onde ir, e o selo continua sendo só
 * um selo, em vez de virar um link quebrado.
 */
export function watchHref(
  providerId: number,
  providerName: string,
  titulo: string,
  reserva: string | null,
): string | null {
  const codificado = encodeURIComponent(titulo)

  const porId = POR_ID[providerId]
  if (porId) return porId(codificado)

  for (const [padrao, busca] of POR_NOME) {
    if (padrao.test(providerName)) return busca(codificado)
  }

  return reserva
}
