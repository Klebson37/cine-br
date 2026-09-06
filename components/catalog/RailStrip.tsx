'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/** Fileira rolável com as setas de navegação. Os cartões continuam sendo
 *  renderizados no servidor e chegam aqui como children. */
export function RailStrip({ children }: { children: React.ReactNode }) {
  const fita = useRef<HTMLDivElement>(null)
  const [podeVoltar, setPodeVoltar] = useState(false)
  const [podeAvancar, setPodeAvancar] = useState(false)

  const medir = useCallback(() => {
    const el = fita.current
    if (!el) return
    const fim = el.scrollWidth - el.clientWidth
    // A folga de 8px evita que arredondamento de subpixel deixe uma seta
    // acesa sem ter para onde ir.
    setPodeVoltar(el.scrollLeft > 8)
    setPodeAvancar(el.scrollLeft < fim - 8)
  }, [])

  useEffect(() => {
    const el = fita.current
    if (!el) return
    medir()
    const observador = new ResizeObserver(medir)
    observador.observe(el)
    return () => observador.disconnect()
  }, [medir])

  function rolar(direcao: 1 | -1) {
    const el = fita.current
    if (!el) return
    const suave = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    // Uma "página" deixa um pôster da tela anterior à vista, para não
    // perder o fio da leitura.
    el.scrollBy({
      left: direcao * el.clientWidth * 0.85,
      behavior: suave ? 'smooth' : 'auto',
    })
  }

  return (
    <div className="group/fita relative">
      <div
        ref={fita}
        onScroll={medir}
        className="fita flex gap-3 overflow-x-auto px-[var(--margem)] pb-7 pt-3"
      >
        {children}
      </div>

      {podeVoltar && <Seta direcao={-1} aoClicar={() => rolar(-1)} />}
      {podeAvancar && <Seta direcao={1} aoClicar={() => rolar(1)} />}
    </div>
  )
}

function Seta({
  direcao,
  aoClicar,
}: {
  direcao: 1 | -1
  aoClicar: () => void
}) {
  const paraTras = direcao === -1

  return (
    <button
      type="button"
      onClick={aoClicar}
      aria-label={paraTras ? 'Ver os filmes anteriores' : 'Ver mais filmes'}
      className={`absolute bottom-10 top-3 z-20 hidden w-[var(--margem)] min-w-12 items-center justify-center text-projecao opacity-0 transition-opacity duration-200 focus-visible:opacity-100 group-hover/fita:opacity-100 md:flex ${
        paraTras
          ? 'left-0 bg-gradient-to-r from-tinta via-tinta/85 to-transparent'
          : 'right-0 bg-gradient-to-l from-tinta via-tinta/85 to-transparent'
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden
        className="size-7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={paraTras ? 'M15 5 8 12l7 7' : 'M9 5l7 7-7 7'} />
      </svg>
    </button>
  )
}
