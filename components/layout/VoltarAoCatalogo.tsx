import Link from 'next/link'

/** O caminho de volta da página do filme para o catálogo.
 *
 *  É um link fixo para a home, não um "voltar" do histórico: quem abre o
 *  endereço de um filme compartilhado nunca esteve no catálogo, e um botão
 *  que às vezes sai do site é pior do que um que sempre leva ao mesmo lugar.
 *  O rótulo diz o destino, então promete exatamente o que cumpre. */
export function VoltarAoCatalogo({ className = '' }: { className?: string }) {
  return (
    <Link
      href="/"
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
      Voltar ao catálogo
    </Link>
  )
}
