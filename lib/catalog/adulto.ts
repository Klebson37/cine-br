/** A seção +18: cinema de teor adulto.
 *
 *  Duas sondagens ao TMDB decidiram a forma desta seção.
 *
 *  A primeira: `include_adult=true` no /discover devolve ZERO títulos
 *  pornográficos — em cem resultados, nenhum com `adult: true`. O TMDB tira
 *  esses títulos daquele endpoint por completo; eles só aparecem no /search,
 *  e só digitando o nome exato. Não existe catálogo pornográfico navegável
 *  para construir em cima, e nenhum parâmetro cria um.
 *
 *  A segunda corrigiu a primeira versão desta seção, que era montada por
 *  classificação etária. "18 anos no Brasil" trazia Deadpool, Demon Slayer e
 *  Todo Mundo em Pânico: selo adulto por violência, não por teor. O que
 *  separa teor é a palavra-chave — e por ela são 5.022 filmes, com origem em
 *  francês, italiano, japonês, russo, espanhol e português.
 *
 *  É cinema erótico comercial e classificado, não pornografia. A diferença
 *  está escrita na própria página. */

/** As chaves do TMDB que descrevem teor erótico.
 *
 *  Ficaram de fora, deliberadamente:
 *
 *  - `sexuality` (738), que descreve descoberta e identidade, não teor: era
 *    ela que trazia "Juno" e "Com Amor, Simon" para uma seção adulta.
 *  - `teenage sexuality` (156777) e qualquer chave sobre menores.
 *  - `sex trafficking` e afins, que descrevem crime, não erotismo. */
const EROTICO = ['256466', '325693', '155477', '298666', '302868']
const SEDUCAO = ['3182', '41260', '361114', '340823']
const NUDEZ = ['281741', '359980', '380475']

/** O pipe é OU no TMDB; a vírgula seria E, e pediria um filme que tivesse
 *  todas as chaves ao mesmo tempo — que não existe. */
function ou(...grupos: string[][]): string {
  return grupos.flat().join('|')
}

const TUDO = ou(EROTICO, SEDUCAO, NUDEZ)

export interface FaixaAdulta {
  key: string
  titulo: string
  keywords: string
  /** Sobrepõe a ordenação padrão por popularidade. */
  sortBy?: string
  /** Piso de votos, para a fileira de melhor avaliados não abrir com um
   *  filme de nota 10 e três votos. */
  minVoteCount?: number
}

/** As fileiras da seção, na ordem em que aparecem. A que vier vazia some
 *  sozinha — o MovieRail já devolve null para lista vazia. */
export const FAIXAS_ADULTAS: FaixaAdulta[] = [
  { key: 'populares', titulo: 'Os 10 mais populares', keywords: TUDO },
  { key: 'erotico', titulo: 'Erótico', keywords: ou(EROTICO) },
  {
    key: 'seducao',
    titulo: 'Sedução e sensualidade',
    keywords: ou(SEDUCAO),
  },
  { key: 'nudez', titulo: 'Nudez', keywords: ou(NUDEZ) },
  {
    key: 'melhores',
    titulo: 'Os melhores avaliados',
    keywords: TUDO,
    sortBy: 'vote_average.desc',
    minVoteCount: 200,
  },
]

export const MAIOR_IDADE_COOKIE = 'maior18'

/** Um ano, como as outras preferências do site. */
export const MAIOR_IDADE_MAX_AGE = 60 * 60 * 24 * 365

/** O portão é declarado, não verificado — e isto é proposital.
 *
 *  O conteúdo aqui é cinema erótico comercial, o mesmo que a Netflix e a
 *  Prime Video mostram sem pedir documento a ninguém. Guardar foto de
 *  documento e selfie para liberá-lo seria juntar dado biométrico, que a
 *  LGPD trata como dado sensível, num balde que vira alvo de invasão — risco
 *  enorme para uma proteção que o próprio setor não usa neste caso.
 *
 *  Verificação de verdade se faz com provedor certificado que devolve sim ou
 *  não, sem o site chegar a ver o documento. */
export function confirmouMaioridade(valor: string | undefined): boolean {
  return valor === '1'
}
