import type { Availability, Provider } from './types'
import { watchHref } from './watch-links'

/** Como a pessoa chega no filme por aquele serviço. Muda o verbo do botão e
 *  o peso dele: só o que ela já paga merece destaque. */
export type ModoDeAssistir =
  | 'minha'
  | 'gratis'
  | 'assinatura'
  | 'aluguel'
  | 'compra'

export interface OpcaoAssistir {
  provider: Provider
  href: string
  modo: ModoDeAssistir
}

/**
 * Por onde assistir este título, agora.
 *
 * A ordem é a do bolso de quem está olhando: primeiro o que já está pago,
 * depois o que custaria uma assinatura, depois o aluguel, e por último a
 * compra. Oferecer "comprar por R$ 39" a quem tem o filme incluído na
 * Netflix seria o app trabalhando contra o próprio motivo de existir.
 *
 * Devolve null quando não há para onde ir — e aí a página não inventa um
 * botão que leva a lugar nenhum.
 */
export function melhorOpcaoParaAssistir(
  availability: Availability,
  titulo: string,
  selectedIds: readonly number[] = [],
): OpcaoAssistir | null {
  // Um serviço grátis que a pessoa marcou também é "meu": ela já o escolheu,
  // e não paga por ele.
  const minhas = [...availability.flatrate, ...availability.free].filter((p) =>
    selectedIds.includes(p.id),
  )

  const candidatos: [Provider[], ModoDeAssistir][] = [
    [minhas, 'minha'],
    // Grátis vem antes de uma assinatura que a pessoa não tem: mandá-la para
    // uma tela de cadastro quando o filme está de graça em outro lugar seria
    // o app custando dinheiro a quem ele deveria economizar.
    [availability.free, 'gratis'],
    [availability.flatrate, 'assinatura'],
    [availability.rent, 'aluguel'],
    [availability.buy, 'compra'],
  ]

  for (const [lista, modo] of candidatos) {
    for (const provider of lista) {
      const href = watchHref(provider.id, provider.name, titulo, availability.link)
      // Um serviço sem endereço conhecido não vira botão principal: melhor
      // cair no seguinte da fila do que num link que não leva ao filme.
      if (href !== null) return { provider, href, modo }
    }
  }

  return null
}

/** O rótulo do botão. Diz o verbo certo e o nome do serviço, para ninguém
 *  clicar em "Assistir" e cair numa tela de compra. */
export function rotuloDeAssistir(opcao: OpcaoAssistir): string {
  const verbo =
    opcao.modo === 'aluguel'
      ? 'Alugar'
      : opcao.modo === 'compra'
        ? 'Comprar'
        : 'Assistir'
  const onde = `${verbo} na ${opcao.provider.name}`
  // A gratuidade entra no rótulo, não numa legenda ao lado: é a informação
  // que decide o clique.
  return opcao.modo === 'gratis' ? `${onde} — de graça` : onde
}
