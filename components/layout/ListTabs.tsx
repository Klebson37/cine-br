import Link from 'next/link'

export type TabKey = 'discover' | 'series' | 'want' | 'watched'

const ABAS: { key: TabKey; href: string; label: string }[] = [
  { key: 'discover', href: '/', label: 'Filmes' },
  { key: 'series', href: '/series', label: 'Séries' },
  { key: 'want', href: '/quero-assistir', label: 'Quero assistir' },
  { key: 'watched', href: '/assisti', label: 'Já assisti' },
]

/** As abas aparecem para quem não tem conta também. Escondê-las esconderia
 *  a razão de criar uma.
 *
 *  A fita rola no celular: as quatro somam mais que a largura de um
 *  telefone, e cortar a última seria pior que deixá-la a um arrasto de
 *  distância. */
export function ListTabs({ active }: { active: TabKey }) {
  return (
    <nav
      aria-label="Seções do catálogo"
      className="fita fita-justa flex gap-1 overflow-x-auto border-b border-borda"
    >
      {ABAS.map((aba) => {
        const ativa = aba.key === active
        return (
          <Link
            key={aba.key}
            href={aba.href}
            aria-current={ativa ? 'page' : undefined}
            className={`-mb-px shrink-0 whitespace-nowrap border-b-2 px-3 py-2 text-sm transition-colors ${
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
