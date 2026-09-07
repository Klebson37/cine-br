import Link from 'next/link'

/** Primeiros passos para quem chega sem nunca ter usado o site.
 *
 *  Aparece apenas enquanto nenhum streaming foi escolhido, e some sozinho
 *  quando a pessoa dá o primeiro passo — sem botão de fechar e sem guardar
 *  estado, porque a própria escolha já é o sinal de que não precisa mais. */
export function GettingStarted() {
  return (
    <section
      aria-labelledby="primeiros-passos"
      className="rounded-sm border border-borda bg-sala/40 px-5 py-5 sm:px-6"
    >
      <h2
        id="primeiros-passos"
        className="titulo-secao text-base text-projecao"
      >
        Como usar o CineBR
      </h2>

      <p className="mt-2 max-w-[62ch] text-sm leading-relaxed text-nevoa">
        Aqui você só vê filmes já incluídos nos streamings que assina — sem
        descobrir o preço do aluguel depois de se interessar.
      </p>

      <ol className="mt-4 grid gap-3 sm:grid-cols-3">
        <li className="text-sm leading-relaxed text-projecao/80">
          <span className="mr-1.5 font-semibold text-cortina">1.</span>
          <Link
            href="/?providers=open"
            className="font-medium text-projecao underline decoration-borda underline-offset-4 transition-colors hover:decoration-luz"
          >
            Escolha seus streamings
          </Link>{' '}
          e o catálogo passa a mostrar só o que está incluído neles.
        </li>

        <li className="text-sm leading-relaxed text-projecao/80">
          <span className="mr-1.5 font-semibold text-cortina">2.</span>
          Use os botões <span className="whitespace-nowrap text-luz">★ 8+</span>{' '}
          para ver só o que é bem avaliado no IMDb.
        </li>

        <li className="text-sm leading-relaxed text-projecao/80">
          <span className="mr-1.5 font-semibold text-cortina">3.</span>
          <Link
            href="/auth/login"
            className="font-medium text-projecao underline decoration-borda underline-offset-4 transition-colors hover:decoration-luz"
          >
            Entre com o Google
          </Link>{' '}
          para marcar o que quer assistir e o que já assistiu.
        </li>
      </ol>
    </section>
  )
}
