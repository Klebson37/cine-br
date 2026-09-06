import Link from 'next/link'
import { Suspense } from 'react'
import { SearchField } from './SearchField'

interface HeaderProps {
  selectedCount: number
}

export function Header({ selectedCount }: HeaderProps) {
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

      <div className="flex h-full items-center gap-3 px-[var(--margem)] sm:gap-6">
        {/* O contraste de largura dentro da própria palavra: o eixo do
            Archivo faz o trabalho que uma segunda fonte faria. */}
        <Link
          href="/"
          className="sobre-arte shrink-0 text-xl font-bold tracking-tight text-projecao"
        >
          <span className="panoramico">Cine</span>
          <span className="font-normal text-nevoa">BR</span>
        </Link>

        <form
          action="/search"
          className="min-w-0 flex-1 sm:max-w-[24rem]"
          role="search"
        >
          <Suspense
            fallback={
              <div className="h-[2.375rem] w-full rounded-sm border border-projecao/15 bg-tinta/50" />
            }
          >
            <SearchField />
          </Suspense>
        </form>

        <span className="hidden flex-1 sm:block" />

        <Link
          href="/?providers=open"
          className="shrink-0 rounded-sm border border-projecao/20 bg-tinta/40 px-3 py-2 text-sm text-projecao backdrop-blur-md transition-colors hover:border-luz/60 hover:text-luz"
        >
          <span className="hidden sm:inline">Meus streamings </span>
          <span className="sm:hidden">Streamings </span>({selectedCount})
        </Link>
      </div>
    </header>
  )
}
