import { formatRatingShort } from '@/lib/catalog/format'

interface NotaProps {
  rating: number | null
  /** 'cartaz' é o selo pequeno sobre a arte; 'destaque' é a nota lida como
   *  informação principal, na página do filme e no herói. */
  variant?: 'cartaz' | 'destaque'
}

/** O selo de nota — o mesmo objeto em dois tamanhos.
 *
 *  Filme nunca votado não tem selo: zero seria lido como nota ruim, e não
 *  como ausência de nota. A estrela é decorativa; quem lê a tela ouve
 *  "Nota" antes do número.
 *
 *  Existia escrito à mão dentro do cartão, e em lugar nenhum além dele — na
 *  página do filme a nota saía como texto cinza espremido entre o ano e a
 *  duração, sem estrela e sem destaque, apesar de ser o dado que decide se
 *  a pessoa assiste. */
export function Nota({ rating, variant = 'cartaz' }: NotaProps) {
  const nota = formatRatingShort(rating)
  if (nota === null) return null

  if (variant === 'destaque') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-luz/40 bg-luz/[0.08] px-3.5 py-1.5 tabular-nums shadow-[0_0_26px_-10px_rgba(255,194,75,0.9)]">
        <span aria-hidden className="text-base leading-none text-luz">
          ★
        </span>
        <span className="sr-only">Nota</span>
        <span className="text-lg font-bold leading-none text-luz">{nota}</span>
        <span className="text-xs font-medium leading-none text-luz/55">
          /10
        </span>
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-[0.15rem] rounded-full border border-luz/30 bg-tinta/80 px-1.5 py-[0.1rem] text-[0.6875rem] font-semibold tabular-nums backdrop-blur-[2px]">
      <span aria-hidden className="text-luz">
        ★
      </span>
      <span className="sr-only">Nota</span>
      {nota}
    </span>
  )
}
