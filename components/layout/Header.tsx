import Link from 'next/link'

interface HeaderProps {
  selectedCount: number
  onOpenProviders?: never
}

export function Header({ selectedCount }: HeaderProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-neutral-800 bg-neutral-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
        <Link href="/" className="text-lg font-bold text-white">
          Cine<span className="text-emerald-400">BR</span>
        </Link>

        <form action="/search" className="flex-1">
          <input
            type="search"
            name="q"
            placeholder="Buscar filme..."
            aria-label="Buscar filme"
            className="w-full rounded-full bg-neutral-900 px-4 py-2 text-sm text-white outline-none ring-emerald-500 focus:ring-2"
          />
        </form>

        <Link
          href="/?providers=open"
          className="whitespace-nowrap rounded-full bg-neutral-900 px-4 py-2 text-sm text-white"
        >
          Meus streamings ({selectedCount})
        </Link>
      </div>
    </header>
  )
}
