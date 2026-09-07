'use client'

import { useSearchParams } from 'next/navigation'

/** O campo precisa lembrar o que foi buscado: voltar de um filme para os
 *  resultados e achar a caixa vazia faz parecer que a busca se perdeu. */
export function SearchField() {
  const busca = useSearchParams().get('q') ?? ''

  return (
    <input
      key={busca}
      type="search"
      name="q"
      defaultValue={busca}
      placeholder="Buscar um filme"
      aria-label="Buscar um filme"
      className="h-9 w-full rounded-sm border border-projecao/15 bg-tinta/50 px-3 text-sm text-projecao backdrop-blur-md placeholder:text-nevoa focus:border-projecao/30 focus:outline-none"
    />
  )
}
