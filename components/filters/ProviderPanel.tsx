import Image from 'next/image'
import { saveProviders } from '@/app/actions'
import type { Provider } from '@/lib/catalog/types'
import { MAX_PROVIDERS } from '@/lib/preferences'

interface ProviderPanelProps {
  providers: Provider[]
  selectedIds: number[]
}

export function ProviderPanel({ providers, selectedIds }: ProviderPanelProps) {
  return (
    <form action={saveProviders} className="rounded-lg bg-neutral-900 p-4">
      <p className="mb-3 text-sm text-neutral-300">
        Marque os streamings que você assina (até {MAX_PROVIDERS}).
      </p>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {providers.map((provider) => (
          <label
            key={provider.id}
            className="flex cursor-pointer items-center gap-2 rounded bg-neutral-800 px-3 py-2 text-sm"
          >
            <input
              type="checkbox"
              name="providers"
              value={provider.id}
              defaultChecked={selectedIds.includes(provider.id)}
            />
            {provider.logoUrl && (
              <Image
                src={provider.logoUrl}
                alt=""
                width={24}
                height={24}
                className="rounded"
              />
            )}
            <span className="truncate">{provider.name}</span>
          </label>
        ))}
      </div>

      <button
        type="submit"
        className="mt-4 rounded-full bg-emerald-500 px-5 py-2 text-sm font-medium text-neutral-950"
      >
        Salvar
      </button>
    </form>
  )
}
