import Link from 'next/link'

interface EmptyStateProps {
  title?: string
  hint?: string
  actionLabel?: string
  actionHref?: string
}

export function EmptyState({
  title = 'Nenhum filme com esses filtros.',
  hint = 'Tire o gênero ou marque mais um streaming para abrir o catálogo.',
  actionLabel = 'Limpar filtros',
  actionHref = '/',
}: EmptyStateProps) {
  return (
    <div className="border-t border-borda py-14">
      <p className="panoramico max-w-[24ch] text-2xl font-semibold leading-tight text-projecao">
        {title}
      </p>
      <p className="mt-3 max-w-[52ch] text-sm leading-relaxed text-nevoa">
        {hint}
      </p>
      <Link
        href={actionHref}
        className="mt-6 inline-block rounded-sm border border-borda px-5 py-2.5 text-sm font-medium text-projecao transition-colors hover:border-projecao/50"
      >
        {actionLabel}
      </Link>
    </div>
  )
}
