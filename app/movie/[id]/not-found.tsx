import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center gap-4 py-20 text-center">
      <p className="text-lg text-neutral-200">Filme não encontrado.</p>
      <Link
        href="/"
        className="rounded-full bg-emerald-500 px-5 py-2 text-sm font-medium text-neutral-950"
      >
        Voltar ao catálogo
      </Link>
    </div>
  )
}
