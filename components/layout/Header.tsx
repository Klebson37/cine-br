import Link from 'next/link'
import { Suspense } from 'react'
import type { CurrentUser } from '@/lib/marks/queries'
import { AuthButton } from './AuthButton'
import { BOTAO_CABECALHO } from './chrome'
import { SearchField } from './SearchField'

interface HeaderProps {
  selectedCount: number
  user: CurrentUser | null
}

export function Header({ selectedCount, user }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 isolate h-[var(--cabecalho)]">
      {/* Fundo que só aparece com a rolagem, para a arte do herói ocupar o
          topo da tela. */}
      <div
        aria-hidden
        className="fundo-cabecalho pointer-events-none absolute inset-0 -z-10"
      />
      {/* Véu curto permanente: garante a leitura do cabeçalho sobre qualquer
          arte, inclusive nos navegadores sem linha do tempo de rolagem. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-20 h-32 bg-gradient-to-b from-tinta/85 via-tinta/40 to-transparent"
      />

      <div className="flex h-full items-center gap-1.5 px-[var(--margem)] sm:gap-4 lg:gap-6">
        <Marca />

        {/* No celular o campo inteiro não cabe ao lado da marca, dos
            streamings e da conta: ele saía com 51px de largura, o bastante
            para uma letra do texto de ajuda. Da largura sm para cima o campo
            aparece; abaixo dela, a lupa leva à busca, que tem o campo. */}
        <form
          action="/search"
          className="hidden min-w-0 flex-1 sm:block sm:max-w-[24rem]"
          role="search"
        >
          <Suspense
            fallback={
              <div className="h-9 w-full rounded-full border border-projecao/15 bg-projecao/[0.06]" />
            }
          >
            <SearchField />
          </Suspense>
        </form>

        <span className="flex-1" />

        <Link
          href="/search"
          aria-label="Buscar um filme"
          className={`${BOTAO_CABECALHO} w-8 px-0 sm:hidden`}
        >
          <Lupa />
        </Link>

        <Link
          href="/?providers=open"
          aria-label={`Meus streamings (${selectedCount} escolhidos)`}
          className={`${BOTAO_CABECALHO} px-2 sm:px-3.5`}
        >
          <Tela />
          <span className="hidden sm:inline">Meus streamings</span>
          {/* Dourado quando há serviços marcados: no site inteiro o dourado
              quer dizer "isso é seu". Zero não é conquista nenhuma. */}
          <span
            className={`hidden tabular-nums sm:inline ${
              selectedCount > 0 ? 'text-luz' : 'text-nevoa'
            }`}
          >
            ({selectedCount})
          </span>
        </Link>

        {/* Dourado, do lado dos streamings: no site inteiro o dourado quer
            dizer "isso e seu", e nada e mais seu do que o que nao custa
            nada. O brilho respira devagar para chamar o olho sem competir
            com o vermelho do +18 ao lado. */}
        <Link
          href="/gratis"
          aria-label="Filmes de graca, sem assinatura"
          className="brilho-gratis inline-flex h-9 shrink-0 items-center justify-center gap-1 rounded-full border border-luz/60 bg-luz/15 px-2 text-sm font-semibold text-luz backdrop-blur-md transition-colors hover:border-luz hover:bg-luz/25 sm:px-3.5"
        >
          <span className="hidden sm:contents">
            <Presente />
          </span>
          Grátis
        </Link>

        {/* Ao lado dos streamings, com cadeado: a porta e visivel antes de
            ser aberta, e ninguem entra sem saber que entrou. Contornado, nao
            preenchido — o vermelho cheio ao lado e do Entrar, e dois botoes
            cheios na mesma barra desfazem os dois. */}
        <Link
          href="/mais18"
          aria-label="Secao mais 18, conteudo classificado para adultos"
          className="pulso-18 inline-flex h-9 shrink-0 items-center justify-center gap-1 rounded-full border border-cortina/50 bg-cortina/10 px-2 text-sm font-semibold text-cortina backdrop-blur-md transition-colors hover:border-cortina hover:bg-cortina/20 sm:px-3.5"
        >
          <span className="hidden sm:contents">
            <Cadeado />
          </span>
          +18
        </Link>

        <AuthButton user={user} />
      </div>
    </header>
  )
}

function Presente() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className="size-[0.95rem]"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3.5 11h17v9.5h-17z" />
      <path d="M2 7.5h20V11H2zM12 7.5v13" />
      <path d="M12 7.5S10.6 3 8.2 3a2.2 2.2 0 0 0 0 4.5zM12 7.5S13.4 3 15.8 3a2.2 2.2 0 0 1 0 4.5z" />
    </svg>
  )
}

function Cadeado() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className="size-[0.95rem]"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
      <path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3" />
    </svg>
  )
}

/** A marca: um sinal vermelho antes da palavra.
 *
 *  O quadrado com o triângulo repete a régua vermelha que abre cada seção
 *  do site, então a barra passa a pertencer visivelmente à mesma peça que o
 *  conteúdo. Só a palavra, sem sinal, não dizia de que site se tratava até
 *  a pessoa ler. */
function Marca() {
  return (
    <Link
      href="/"
      className="sobre-arte group/marca flex h-9 shrink-0 items-center gap-2 text-xl font-bold tracking-tight text-projecao"
    >
      <span
        aria-hidden
        className="flex size-7 items-center justify-center rounded-[0.5rem] bg-cortina shadow-[0_0_18px_-4px_rgba(229,9,20,0.95)] transition-transform duration-300 group-hover/marca:scale-110"
      >
        <svg viewBox="0 0 24 24" className="size-3.5 translate-x-px" fill="#fff">
          <path d="M8 5.4v13.2L19 12z" />
        </svg>
      </span>
      {/* No celular fica so o sinal: com a palavra, os cinco controles da
          barra somavam 412px para 350 disponiveis, e o ultimo vazava para
          fora da tela. O sinal vermelho sozinho ja identifica e leva para
          casa, como faz qualquer aplicativo. */}
      <span className="hidden items-baseline sm:flex">
        <span className="panoramico">Cine</span>
        <span className="font-normal text-nevoa">BR</span>
      </span>
    </Link>
  )
}

function Lupa() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className="size-[1.35rem]"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.6-3.6" />
    </svg>
  )
}

function Tela() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className="size-[1.15rem]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2.5" y="4" width="19" height="13" rx="2" />
      <path d="M8.5 20.5h7" />
    </svg>
  )
}
