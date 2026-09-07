/** Vocabulário das marcações. Puro de propósito: a regra do ciclo do botão
 *  é a mais visível do recurso e precisa ser testável sozinha. */

export const MARK_STATES = ['want', 'watched'] as const
export type MarkState = (typeof MARK_STATES)[number]

export const MARK_LABEL: Record<MarkState, string> = {
  want: 'Quero assistir',
  watched: 'Já assisti',
}

/** Lista fechada: o valor vem de um formulário, que é entrada não confiável.
 *  Mesmo espírito tolerante do parseProviderCookie — lixo vira ausência. */
export function parseMarkState(raw: string | undefined): MarkState | null {
  return (MARK_STATES as readonly string[]).includes(raw ?? '')
    ? (raw as MarkState)
    : null
}

/** O ciclo do botão do cartão: sem marca → quero assistir → já assisti →
 *  sem marca. Três passos num controle só, para o cartão não precisar de
 *  dois botões sobre um pôster de 10rem. */
export function nextMarkState(current: MarkState | null): MarkState | 'none' {
  if (current === null) return 'want'
  return current === 'want' ? 'watched' : 'none'
}
