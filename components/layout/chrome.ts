/** Os controles do cabeçalho.
 *
 *  Pílula, não retângulo: o conteúdo do site é de canto reto — cartazes,
 *  painéis, cartões — e a moldura é arredondada. A diferença de forma separa
 *  navegação de catálogo sem gastar cor nenhuma.
 *
 *  A altura é fixa em vez de vir do padding, para os quatro alinharem mesmo
 *  quando um tem só ícone, outro só texto e outro os dois. */
export const BOTAO_CABECALHO =
  'inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full border border-projecao/15 bg-projecao/[0.06] px-3.5 text-sm text-projecao backdrop-blur-md transition-colors hover:border-luz/55 hover:bg-projecao/[0.11] hover:text-luz'

/** O único botão cheio da barra.
 *
 *  Entrar é a ação que abre as listas — a única coisa no cabeçalho que a
 *  pessoa ainda não pode fazer. O resto é navegação, e navegação não compete
 *  com ela. Um botão aceso só funciona enquanto for o único. */
export const BOTAO_DESTAQUE =
  'inline-flex h-9 shrink-0 items-center justify-center rounded-full bg-cortina px-4 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_rgba(229,9,20,0.85)] transition-[background-color,box-shadow,transform] hover:-translate-y-[1px] hover:bg-[#f6121d] hover:shadow-[0_12px_30px_-8px_rgba(229,9,20,1)]'
