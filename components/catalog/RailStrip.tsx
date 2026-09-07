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
    <div className="relative">
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

  // A fita tem pt-3 e pb-7: o centro do pôster fica 0.875rem acima do centro
  // da caixa, e é nele que o círculo se alinha.
  return (
    <button
      type="button"
      onClick={aoClicar}
      aria-label={paraTras ? 'Ver os filmes anteriores' : 'Ver mais filmes'}
      className={`absolute top-[calc(50%-0.875rem)] z-20 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-cortina text-white shadow-lg shadow-tinta/70 transition-transform duration-200 hover:scale-110 focus-visible:scale-110 sm:size-11 ${
        paraTras ? 'left-1 sm:left-2' : 'right-1 sm:right-2'
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden
        className="size-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={paraTras ? 'M15 5 8 12l7 7' : 'M9 5l7 7-7 7'} />
      </svg>
    </button>
  )
}
