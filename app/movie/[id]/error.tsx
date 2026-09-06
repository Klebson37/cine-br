'use client'

export default function Error({ reset }: { reset: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 py-20 text-center">
      <p className="text-lg text-neutral-200">
        Não conseguimos carregar esse filme agora.
      </p>
      <p className="text-sm text-neutral-400">
        Pode ser uma instabilidade temporária do TMDB.
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-full bg-emerald-500 px-5 py-2 text-sm font-medium text-neutral-950"
      >
        Tentar de novo
      </button>
    </div>
  )
}
