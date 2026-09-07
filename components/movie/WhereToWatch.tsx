import Image from 'next/image'
import type { Availability, Provider } from '@/lib/catalog/types'
import { watchHref } from '@/lib/catalog/watch-links'

interface WhereToWatchProps {
  availability: Availability
  /** Serviços que o usuário assina. Sem eles, não dá para dizer "sua"
   *  assinatura — e o dourado só vale para o que ele já paga. */
  selectedIds?: number[]
  /** Título do filme, para o link abrir o serviço já procurando por ele. */
  title?: string
}

function ProviderList({
  label,
  providers,
  incluido = false,
  title,
  link,
}: {
  label: string
  providers: Provider[]
  incluido?: boolean
  title?: string
  link: string | null
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
        {providers.map((provider) => {
          const href =
            title === undefined
              ? null
              : watchHref(provider.id, provider.name, title, link)

          const conteudo = (
            <>
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
              {href !== null && (
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden
                  className="size-3.5 opacity-55 transition-opacity group-hover/servico:opacity-100"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M7 17 17 7M9 7h8v8" />
                </svg>
              )}
            </>
          )

          const base = `flex items-center gap-2 rounded-sm border px-2.5 py-1.5 text-sm ${
            incluido
              ? 'border-luz/40 bg-luz/5 text-projecao'
              : 'border-borda bg-tinta text-nevoa'
          }`

          return (
            <li key={provider.id}>
              {href === null ? (
                <span className={base}>{conteudo}</span>
              ) : (
                /* Abre em outra aba: a pessoa vai assistir, e voltar para o
                   catálogo depois não deveria custar o histórico dela. */
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Assistir em ${provider.name} — abre em nova aba`}
                  className={`group/servico transition-colors ${base} ${
                    incluido
                      ? 'hover:border-luz hover:bg-luz/10'
                      : 'hover:border-nevoa/60 hover:text-projecao'
                  }`}
                >
                  {conteudo}
                </a>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function WhereToWatch({
  availability,
  selectedIds,
  title,
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

  const comum = { title, link: availability.link }

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
            {...comum}
          />
          <ProviderList
            label="Em assinaturas que você não tem"
            providers={outros}
            {...comum}
          />
          <ProviderList label="Aluguel" providers={availability.rent} {...comum} />
          <ProviderList label="Compra" providers={availability.buy} {...comum} />
        </div>
      )}
    </section>
  )
}
