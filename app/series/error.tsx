'use client'

export default function Error({ reset }: { reset: () => void }) {
  return (
    <div className="wrap pt-16">
      <p className="panoramico max-w-[20ch] text-3xl font-semibold leading-tight text-projecao">
        As séries não carregaram.
      </p>
      <p className="mt-4 max-w-[52ch] text-sm leading-relaxed text-nevoa">
        A fonte dos dados, o TMDB, não respondeu. Costuma ser passageiro.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-sm border border-borda px-5 py-2.5 text-sm font-medium text-projecao transition-colors hover:border-projecao/50"
      >
        Tentar de novo
      </button>
    </div>
  )
}
