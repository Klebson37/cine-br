'use client'

import { useSearchParams } from 'next/navigation'

/** O campo precisa lembrar o que foi buscado: voltar de um filme para os
 *  resultados e achar a caixa vazia faz parecer que a busca se perdeu. */
export function SearchField() {
  const busca = useSearchParams().get('q') ?? ''

  return (
    <div className="relative">
      {/* A lupa dentro do campo, nao ao lado: diz o que a caixa faz sem
          gastar uma palavra de largura, que no celular e o que falta. */}
      <span
        aria-hidden
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-nevoa"
      >
        <svg
          viewBox="0 0 24 24"
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
      </span>
      <input
        key={busca}
        type="search"
        name="q"
        defaultValue={busca}
        placeholder="Buscar um filme"
        aria-label="Buscar um filme"
        className="h-9 w-full rounded-full border border-projecao/15 bg-projecao/[0.06] pl-9 pr-4 text-sm text-projecao backdrop-blur-md transition-colors placeholder:text-nevoa focus:border-luz/55 focus:bg-projecao/[0.11] focus:outline-none"
      />
    </div>
  )
}
