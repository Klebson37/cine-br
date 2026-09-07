'use client'

export default function Error({ reset }: { reset: () => void }) {
  return (
    <div className="wrap pt-16 text-center">
      <h1 className="text-xl text-projecao">
        Não consegui carregar sua lista.
      </h1>
      <p className="mt-2 text-sm text-nevoa">
        Seus filmes marcados continuam guardados. Foi a consulta que falhou.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-sm border border-borda px-4 py-2 text-sm text-projecao transition-colors hover:border-projecao/50"
      >
        Tentar de novo
      </button>
    </div>
  )
}
