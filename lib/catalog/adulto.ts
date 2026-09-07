/** A seção +18: filmes classificados como adultos pelos órgãos oficiais.
 *
 *  Sondei o TMDB antes de desenhar isto, e o resultado decidiu a forma da
 *  seção. `include_adult=true` no /discover devolve **zero** títulos
 *  pornográficos — em cem resultados, nenhum com `adult: true`. O TMDB tira
 *  esses títulos do discover por completo; eles só aparecem no /search, e
 *  só quando se digita o nome exato. Não existe catálogo pornográfico
 *  navegável para construir em cima, e nenhum ajuste de parâmetro cria um.
 *
 *  O que o TMDB entrega, e bem, é a classificação indicativa: 1.311 filmes
 *  com 18 anos no Brasil, 625 NC-17 nos Estados Unidos, 2.409 R18+ no Japão,
 *  5.066 com 18 na Alemanha, 549 na França. Filmes liberados e aprovados
 *  para adultos, de vários lugares do mundo, com a diferença de que a
 *  premissa do CineBR continua valendo: seis de cada oito da amostra estão
 *  numa assinatura brasileira, então o app ainda pode dizer onde assistir.
 *
 *  É esta a seção: cinema adulto por classificação oficial, não pornografia.
 *  A diferença é honesta e está escrita na própria página. */

export interface FaixaAdulta {
  key: string
  /** País do órgão classificador, no formato do TMDB. */
  pais: string
  /** A faixa etária adulta daquele país. Cada órgão usa o próprio código. */
  certificacao: string
  titulo: string
}

/** Uma fileira por órgão classificador. A ordem começa no Brasil, que é o
 *  público do site, e segue pelos catálogos com mais títulos. */
export const FAIXAS_ADULTAS: FaixaAdulta[] = [
  {
    key: 'br',
    pais: 'BR',
    certificacao: '18',
    titulo: 'Classificados 18 anos no Brasil',
  },
  {
    key: 'us',
    pais: 'US',
    certificacao: 'NC-17',
    titulo: 'NC-17 nos Estados Unidos',
  },
  { key: 'jp', pais: 'JP', certificacao: 'R18+', titulo: 'R18+ no Japão' },
  { key: 'de', pais: 'DE', certificacao: '18', titulo: '18 anos na Alemanha' },
  { key: 'fr', pais: 'FR', certificacao: '18', titulo: '18 anos na França' },
]

/** A fileira de abertura, que é uma classificação de dez. */
export const FAIXA_DESTAQUE = FAIXAS_ADULTAS[0]

export const MAIOR_IDADE_COOKIE = 'maior18'

/** Um ano, como as outras preferências do site. */
export const MAIOR_IDADE_MAX_AGE = 60 * 60 * 24 * 365

/** O portão é declarado, não verificado — e isto é proposital.
 *
 *  O conteúdo aqui é cinema com classificação 18, o mesmo que a Netflix
 *  mostra sem pedir documento a ninguém. Guardar foto de documento e selfie
 *  para liberar "Coringa" seria juntar dado biométrico, que a LGPD trata
 *  como dado sensível, num balde que vira alvo de invasão — risco enorme
 *  para uma proteção que o próprio setor não usa neste caso.
 *
 *  Se um dia a seção passar a listar conteúdo que exija verificação real,
 *  o caminho é um provedor certificado devolvendo sim ou não, sem o site
 *  chegar a ver o documento. */
export function confirmouMaioridade(valor: string | undefined): boolean {
  return valor === '1'
}
