import Link from 'next/link'

interface EmptyStateProps {
  title?: string
  hint?: string
}

export function EmptyState({
  title = 'Nenhum filme com esses filtros.',
  hint = 'Tente remover o gênero ou incluir mais streamings.',
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-neutral-800 px-6 py-16 text-center">
      <p className="text-lg font-medium text-neutral-200">{title}</p>
      <p className="text-sm text-neutral-400">{hint}</p>
      <Link
        href="/"
        className="mt-2 rounded-full bg-emerald-500 px-5 py-2 text-sm font-medium text-neutral-950"
      >
        Limpar filtros
      </Link>
    </div>
  )
}
