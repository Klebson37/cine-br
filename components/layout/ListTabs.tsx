import Link from 'next/link'

export type TabKey = 'discover' | 'want' | 'watched'

const ABAS: { key: TabKey; href: string; label: string }[] = [
  { key: 'discover', href: '/', label: 'Descobrir' },
  { key: 'want', href: '/quero-assistir', label: 'Quero assistir' },
  { key: 'watched', href: '/assisti', label: 'Já assisti' },
]

/** As abas aparecem para quem não tem conta também. Escondê-las esconderia
 *  a razão de criar uma. */
export function ListTabs({ active }: { active: TabKey }) {
  return (
    <nav aria-label="Suas listas" className="flex gap-1 border-b border-borda">
      {ABAS.map((aba) => {
        const ativa = aba.key === active
        return (
          <Link
            key={aba.key}
            href={aba.href}
            aria-current={ativa ? 'page' : undefined}
            className={`-mb-px border-b-2 px-3 py-2 text-sm transition-colors ${
              ativa
                ? 'border-luz text-projecao'
                : 'border-transparent text-nevoa hover:text-projecao'
            }`}
          >
            {aba.label}
          </Link>
        )
      })}
    </nav>
  )
}
