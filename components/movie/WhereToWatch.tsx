import Image from 'next/image'
import type { Availability, Provider } from '@/lib/catalog/types'

interface WhereToWatchProps {
  availability: Availability
}

function ProviderList({
  label,
  providers,
  highlight = false,
}: {
  label: string
  providers: Provider[]
  highlight?: boolean
}) {
  if (providers.length === 0) return null

  return (
    <div className="mb-4">
      <h3
        className={
          highlight
            ? 'mb-2 text-sm font-semibold text-emerald-400'
            : 'mb-2 text-sm text-neutral-400'
        }
      >
        {label}
      </h3>
      <ul className="flex flex-wrap gap-3">
        {providers.map((provider) => (
          <li
            key={provider.id}
            className="flex items-center gap-2 rounded bg-neutral-800 px-3 py-2 text-sm"
          >
            {provider.logoUrl && (
              <Image
                src={provider.logoUrl}
                alt=""
                width={24}
                height={24}
                className="rounded"
              />
            )}
            {provider.name}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function WhereToWatch({ availability }: WhereToWatchProps) {
  const isEmpty =
    availability.flatrate.length === 0 &&
    availability.rent.length === 0 &&
    availability.buy.length === 0

  return (
    <section className="rounded-lg border border-neutral-800 p-5">
      <h2 className="mb-4 text-xl font-semibold">Onde assistir</h2>

      {isEmpty ? (
        <p className="text-sm text-neutral-400">
          Não está em nenhum streaming no Brasil no momento.
        </p>
      ) : (
        <>
          <ProviderList
            label="Incluído na sua assinatura"
            providers={availability.flatrate}
            highlight
          />
          <ProviderList label="Aluguel" providers={availability.rent} />
          <ProviderList label="Compra" providers={availability.buy} />
        </>
      )}
    </section>
  )
}
