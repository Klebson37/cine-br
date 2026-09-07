import Link from 'next/link'

interface VoltarAoCatalogoProps {
  className?: string
  /** Para onde volta. O padrão é a home, que é o catálogo de filmes. */
  href?: string
  rotulo?: string
}

/** O caminho de volta da página de um título para a lista de onde ele veio.
 *
 *  É um link fixo, não um "voltar" do histórico: quem abre o endereço de um
 *  filme compartilhado nunca esteve no catálogo, e um botão que às vezes sai
 *  do site é pior que um que sempre leva ao mesmo lugar. O rótulo diz o
 *  destino, então promete exatamente o que cumpre. */
export function VoltarAoCatalogo({
  className = '',
  href = '/',
  rotulo = 'Voltar ao catálogo',
}: VoltarAoCatalogoProps) {
  return (
    <Link
      href={href}
      className={`group/voltar inline-flex items-center gap-2 rounded-full border border-borda bg-tinta/70 px-3.5 py-1.5 text-sm font-medium text-projecao backdrop-blur-sm transition-colors hover:border-cortina hover:text-cortina focus-visible:border-cortina focus-visible:text-cortina ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden
        className="size-4 transition-transform duration-200 group-hover/voltar:-translate-x-0.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M15 5 8 12l7 7" />
      </svg>
      {rotulo}
    </Link>
  )
}
