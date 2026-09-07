'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

interface RailStripProps {
  children: React.ReactNode
  /** A fita sangra até a borda da tela, como as fileiras do catálogo, ou
   *  fica dentro da goteira do bloco que a contém, como o elenco na página
   *  do filme — que já está dentro de um `.wrap` e dobraria a margem. */
  sangra?: boolean
  /** Onde as setas se alinham na vertical. O padrão centra no cartaz das
   *  fileiras; quem tem imagem de outra altura passa a sua. */
  alturaSeta?: string
  /** Papel do contêiner para quem lê a tela. O elenco é uma lista de
   *  pessoas; uma fileira de cartazes não é lista de coisa nenhuma. */
  papel?: 'list'
}

/** Fita rolável com as setas de navegação. Os cartões continuam sendo
 *  renderizados no servidor e chegam aqui como children. */
export function RailStrip({
  children,
  sangra = true,
  alturaSeta = 'top-[calc(50%-0.875rem)]',
  papel,
}: RailStripProps) {
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
        role={papel}
        onScroll={medir}
        className={`fita flex gap-3 overflow-x-auto ${
          sangra
            ? 'px-[var(--margem)] pb-7 pt-3'
            : 'fita-justa px-0.5 pb-2 pt-1'
        }`}
      >
        {children}
      </div>

      {podeVoltar && (
        <Seta
          direcao={-1}
          altura={alturaSeta}
          grande={sangra}
          aoClicar={() => rolar(-1)}
        />
      )}
      {podeAvancar && (
        <Seta
          direcao={1}
          altura={alturaSeta}
          grande={sangra}
          aoClicar={() => rolar(1)}
        />
      )}
    </div>
  )
}

function Seta({
  direcao,
  altura,
  grande,
  aoClicar,
}: {
  direcao: 1 | -1
  altura: string
  /** Retrato de elenco tem 88px de largura: um círculo de 44px em cima dele
   *  cobriria metade do rosto. */
  grande: boolean
  aoClicar: () => void
}) {
  const paraTras = direcao === -1

  return (
    <button
      type="button"
      onClick={aoClicar}
      aria-label={paraTras ? 'Ver os anteriores' : 'Ver mais'}
      className={`absolute z-20 flex -translate-y-1/2 items-center justify-center rounded-full bg-cortina text-white shadow-lg shadow-tinta/70 transition-transform duration-200 hover:scale-110 focus-visible:scale-110 ${altura} ${
        grande ? 'size-10 sm:size-11' : 'size-8'
      } ${paraTras ? 'left-1 sm:left-2' : 'right-1 sm:right-2'}`}
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden
        className={grande ? 'size-6' : 'size-5'}
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
