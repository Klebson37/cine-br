'use client'

import Image from 'next/image'
import { useState } from 'react'
import { saveProviders } from '@/app/actions'
import type { Provider } from '@/lib/catalog/types'
import { MAX_PROVIDERS } from '@/lib/preferences'

interface ProviderPanelProps {
  providers: Provider[]
  selectedIds: number[]
}

export function ProviderPanel({ providers, selectedIds }: ProviderPanelProps) {
  const [marcados, setMarcados] = useState<number[]>(selectedIds)
  const noLimite = marcados.length >= MAX_PROVIDERS

  function alternar(id: number, ligado: boolean) {
    setMarcados((atual) =>
      ligado ? [...atual, id] : atual.filter((outro) => outro !== id),
    )
  }

  return (
    <form
      action={saveProviders}
      className="rounded-sm border border-borda bg-sala/70 p-6"
    >
      <h2 className="titulo-secao text-lg text-projecao">
        Quais streamings você assina?
      </h2>
      <p className="mt-2 max-w-[58ch] text-sm leading-relaxed text-nevoa">
        O catálogo passa a mostrar só o que já está incluído neles.
      </p>

      {/* O limite era silencioso: dava para marcar seis e perder dois ao
          salvar. Agora ele aparece e trava antes do prejuízo. */}
      <p
        aria-live="polite"
        className={`mt-4 text-sm ${noLimite ? 'text-luz' : 'text-nevoa'}`}
      >
        {marcados.length} de {MAX_PROVIDERS} marcados
        {noLimite && ' — desmarque um para trocar'}
      </p>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {providers.map((provider) => {
          const ligado = marcados.includes(provider.id)
          const bloqueado = noLimite && !ligado

          return (
            <label
              key={provider.id}
              className={`flex items-center gap-3 rounded-sm border px-3 py-2.5 text-sm transition-colors ${
                ligado
                  ? 'border-luz/70 bg-luz/5'
                  : 'border-borda bg-tinta hover:border-nevoa/50'
              } ${bloqueado ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}`}
            >
              <input
                type="checkbox"
                name="providers"
                value={provider.id}
                checked={ligado}
                disabled={bloqueado}
                onChange={(evento) =>
                  alternar(provider.id, evento.target.checked)
                }
                className="size-4 shrink-0 accent-luz"
              />
              {provider.logoUrl && (
                <Image
                  src={provider.logoUrl}
                  alt=""
                  width={24}
                  height={24}
                  className="shrink-0 rounded-[4px]"
                />
              )}
              <span className="truncate text-projecao/90">{provider.name}</span>
            </label>
          )
        })}
      </div>

      <button
        type="submit"
        className="mt-6 rounded-sm bg-projecao px-5 py-2.5 text-sm font-semibold text-tinta transition-opacity hover:opacity-85"
      >
        Salvar
      </button>
    </form>
  )
}
