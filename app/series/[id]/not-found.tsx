import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="wrap pt-16">
      <p className="panoramico max-w-[20ch] text-3xl font-semibold leading-tight text-projecao">
        Essa série não está no catálogo.
      </p>
      <p className="mt-4 max-w-[52ch] text-sm leading-relaxed text-nevoa">
        O endereço pode estar errado ou o título saiu do TMDB.
      </p>
      <Link
        href="/series"
        className="mt-6 inline-block rounded-sm border border-borda px-5 py-2.5 text-sm font-medium text-projecao transition-colors hover:border-projecao/50"
      >
        Voltar às séries
      </Link>
    </div>
  )
}
