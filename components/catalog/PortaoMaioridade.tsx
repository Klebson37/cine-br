import Link from 'next/link'
import { confirmarMaioridade } from '@/app/actions'

/** O cadeado da seção +18.
 *
 *  Uma declaração, não uma verificação — e a página diz isso em voz alta,
 *  em vez de fingir uma checagem que não existe. O conteúdo é cinema com
 *  classificação 18, o mesmo que qualquer streaming mostra sem pedir
 *  documento a ninguém. */
export function PortaoMaioridade() {
  return (
    <div className="wrap flex min-h-[60vh] items-center pt-10">
      <section
        aria-labelledby="portao-18"
        className="relative mx-auto w-full max-w-[34rem] overflow-hidden rounded-sm border border-borda bg-sala/50 px-6 py-8 text-center sm:px-10"
      >
        {/* Brilho vermelho por trás do cadeado: a seção tem uma porta, e a
            porta precisa parecer uma porta. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-24 h-48 bg-[radial-gradient(50%_60%_at_50%_100%,rgba(229,9,20,0.28),transparent_70%)]"
        />

        <span
          aria-hidden
          className="relative mx-auto flex size-14 items-center justify-center rounded-full border border-cortina/40 bg-cortina/10 shadow-[0_0_36px_-10px_rgba(229,9,20,0.9)]"
        >
          <svg
            viewBox="0 0 24 24"
            className="size-7 text-cortina"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="4" y="10.5" width="16" height="10.5" rx="2.5" />
            <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
            <circle cx="12" cy="15.8" r="1.2" fill="currentColor" stroke="none" />
          </svg>
        </span>

        <h1
          id="portao-18"
          className="panoramico relative mt-5 text-2xl font-bold text-projecao sm:text-3xl"
        >
          Seção +18
        </h1>

        <p className="relative mx-auto mt-4 max-w-[46ch] text-sm leading-relaxed text-nevoa">
          Filmes classificados para maiores de 18 anos pelos órgãos oficiais do
          Brasil, Estados Unidos, Japão, Alemanha e França — e, como no resto
          do site, com a indicação de onde assistir no que você já assina.
        </p>

        <form action={confirmarMaioridade} className="relative mt-7">
          <button
            type="submit"
            className="inline-flex h-11 items-center justify-center rounded-full bg-cortina px-7 text-sm font-semibold text-white shadow-[0_10px_30px_-8px_rgba(229,9,20,0.9)] transition-[background-color,box-shadow,transform] hover:-translate-y-px hover:bg-[#f6121d] hover:shadow-[0_14px_38px_-8px_rgba(229,9,20,1)]"
          >
            Tenho 18 anos ou mais
          </button>
        </form>

        <Link
          href="/"
          className="relative mt-4 inline-block text-sm text-nevoa underline decoration-borda underline-offset-4 transition-colors hover:text-projecao"
        >
          Voltar ao catálogo
        </Link>

        {/* Dito na cara: a confirmação é declarada. Prometer verificação sem
            fazê-la seria pior que não prometer. */}
        <p className="relative mx-auto mt-7 max-w-[48ch] border-t border-borda pt-5 text-xs leading-relaxed text-nevoa/80">
          A confirmação é uma declaração sua, guardada só neste aparelho. O
          CineBR não pede nem guarda documentos: é catálogo, não exibidor, e
          não hospeda vídeo nenhum.
        </p>
      </section>
    </div>
  )
}
