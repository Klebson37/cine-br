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

      <div className="flex h-full items-center gap-2 px-[var(--margem)] sm:gap-6">
        {/* O contraste de largura dentro da própria palavra: o eixo do
            Archivo faz o trabalho que uma segunda fonte faria. */}
        <Link
          href="/"
          className="sobre-arte flex h-9 shrink-0 items-center text-xl font-bold tracking-tight text-projecao"
        >
          <span className="panoramico">Cine</span>
          <span className="font-normal text-nevoa">BR</span>
        </Link>

        {/* No celular o campo inteiro não cabe ao lado do logo, dos
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
              <div className="h-9 w-full rounded-sm border border-projecao/15 bg-tinta/50" />
            }
          >
            <SearchField />
          </Suspense>
        </form>

        <span className="flex-1" />

        <Link
          href="/search"
          aria-label="Buscar um filme"
          className={`${BOTAO_CABECALHO} w-9 px-0 sm:hidden`}
        >
          <Lupa />
        </Link>

        <Link
          href="/?providers=open"
          aria-label={`Meus streamings (${selectedCount} escolhidos)`}
          className={BOTAO_CABECALHO}
        >
          <Tela />
          <span className="hidden sm:inline">Meus streamings</span>
          <span className="tabular-nums">({selectedCount})</span>
        </Link>

        <AuthButton user={user} />
      </div>
    </header>
  )
}

function Lupa() {
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
