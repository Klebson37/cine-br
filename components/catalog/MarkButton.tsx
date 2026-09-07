import Link from 'next/link'
import { setMark } from '@/app/actions'
import { MARK_LABEL, nextMarkState, type MarkState } from '@/lib/marks/types'

interface MarkButtonProps {
  movieId: number
  current: MarkState | null
  signedIn: boolean
  /** 'card' é um controle só, que cicla. 'detail' são dois botões, porque
   *  ali há espaço e o estado precisa ficar legível sem inferência. */
  variant?: 'card' | 'detail'
}

/** Altura fixa em vez de padding: no celular o botão saía com 26px, pequeno
 *  demais para o dedo acertar sem mirar. Sobre o pôster ele fica compacto;
 *  na página do filme é a ação principal e usa a mesma medida dos outros
 *  botões do site. */
const BASE =
  'inline-flex items-center justify-center rounded-sm border transition-colors backdrop-blur-md'

const MEDIDA = {
  card: 'h-8 px-2.5 text-xs',
  detail: 'h-10 px-4 text-sm font-medium',
} as const

const ACESO = 'border-luz/70 bg-tinta/70 text-luz'
const APAGADO = 'border-projecao/25 bg-tinta/60 text-projecao/80 hover:border-luz/50'

/** Um formulário por botão: sem JavaScript, como o resto do site. */
function Form({
  movieId,
  state,
  children,
  className,
  pressed,
  label,
}: {
  movieId: number
  state: MarkState | 'none'
  children: React.ReactNode
  className: string
  pressed: boolean
  label: string
}) {
  return (
    <form action={setMark}>
      <input type="hidden" name="movieId" value={movieId} />
      <input type="hidden" name="state" value={state} />
      <button
        type="submit"
        className={className}
        aria-pressed={pressed}
        aria-label={label}
      >
        {children}
      </button>
    </form>
  )
}

export function MarkButton({
  movieId,
  current,
  signedIn,
  variant = 'card',
}: MarkButtonProps) {
  // Quem não entrou vê o mesmo controle, mas ele leva ao login. Esconder o
  // botão esconderia justamente a razão de criar uma conta.
  const convite = (texto: string, className: string) => (
    <Link href="/auth/login" className={className} aria-label={`${texto} — entre para marcar`}>
      {texto}
    </Link>
  )

  if (variant === 'detail') {
    const botao = (state: MarkState) => {
      const ativo = current === state
      const className = `${BASE} ${MEDIDA.detail} ${ativo ? ACESO : APAGADO}`
      if (!signedIn) return convite(MARK_LABEL[state], className)
      return (
        <Form
          movieId={movieId}
          // Clicar no estado já ativo desmarca.
          state={ativo ? 'none' : state}
          className={className}
          pressed={ativo}
          label={MARK_LABEL[state]}
        >
          {MARK_LABEL[state]}
        </Form>
      )
    }

    return (
      <div className="flex flex-wrap gap-2">
        {botao('want')}
        {botao('watched')}
      </div>
    )
  }

  const texto = current === null ? MARK_LABEL.want : MARK_LABEL[current]
  const className = `${BASE} ${MEDIDA.card} ${current === null ? APAGADO : ACESO}`

  if (!signedIn) return convite(texto, className)

  return (
    <Form
      movieId={movieId}
      state={nextMarkState(current)}
      className={className}
      pressed={current !== null}
      label={texto}
    >
      {texto}
    </Form>
  )
}
