/** O mesmo botão para todo controle do cabeçalho.
 *
 *  A altura é fixa em vez de vir do padding: assim os três controles ficam
 *  alinhados entre si e com o campo de busca, mesmo quando um deles tem
 *  ícone e outro só texto. Antes a regra estava copiada em dois arquivos e
 *  já divergia do campo em 2px. */
export const BOTAO_CABECALHO =
  'inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-sm border border-projecao/20 bg-tinta/40 px-3 text-sm text-projecao backdrop-blur-md transition-colors hover:border-luz/60 hover:text-luz'
