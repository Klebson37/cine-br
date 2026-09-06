import Image from 'next/image'
import type { Availability, Provider } from '@/lib/catalog/types'

interface WhereToWatchProps {
  availability: Availability
  /** Serviços que o usuário assina. Sem eles, não dá para dizer "sua"
   *  assinatura — e o dourado só vale para o que ele já paga. */
  selectedIds?: number[]
}

function ProviderList({
  label,
  providers,
  incluido = false,
}: {
  label: string
  providers: Provider[]
  incluido?: boolean
}) {
  if (providers.length === 0) return null

  return (
    <div
      className={`border-l-[3px] pl-4 ${incluido ? 'border-luz' : 'border-borda'}`}
    >
      <h3
        className={`text-sm font-medium ${incluido ? 'text-luz' : 'text-nevoa'}`}
      >
        {label}
      </h3>
      <ul className="mt-3 flex flex-wrap gap-2">
        {providers.map((provider) => (
          <li
            key={provider.id}
            className={`flex items-center gap-2 rounded-sm border px-2.5 py-1.5 text-sm ${
              incluido
                ? 'border-luz/40 bg-luz/5 text-projecao'
                : 'border-borda bg-tinta text-nevoa'
            }`}
          >
            {provider.logoUrl && (
              <Image
                src={provider.logoUrl}
                alt=""
                width={22}
                height={22}
                className="rounded-[4px]"
              />
            )}
            {provider.name}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function WhereToWatch({
  availability,
  selectedIds,
}: WhereToWatchProps) {
  const isEmpty =
    availability.flatrate.length === 0 &&
    availability.rent.length === 0 &&
    availability.buy.length === 0

  // Sem lista de serviços assinados, toda assinatura conta como "sua".
  const seus = selectedIds
    ? availability.flatrate.filter((p) => selectedIds.includes(p.id))
    : availability.flatrate
  const outros = selectedIds
    ? availability.flatrate.filter((p) => !selectedIds.includes(p.id))
    : []

  return (
    <section className="rounded-sm border border-borda bg-sala/60 p-6">
      <h2 className="titulo-secao text-lg text-projecao">Onde assistir</h2>

      {isEmpty ? (
        <p className="mt-4 max-w-[46ch] text-sm leading-relaxed text-nevoa">
          Não está em nenhum streaming no Brasil no momento.
        </p>
      ) : (
        <div className="mt-6 space-y-7">
          <ProviderList
            label="Incluído na sua assinatura"
            providers={seus}
            incluido
          />
          <ProviderList
            label="Em assinaturas que você não tem"
            providers={outros}
          />
          <ProviderList label="Aluguel" providers={availability.rent} />
          <ProviderList label="Compra" providers={availability.buy} />
        </div>
      )}
    </section>
  )
}
