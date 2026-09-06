/** Executa `fn` sobre `items` com no máximo `limit` promessas vivas ao mesmo
 *  tempo, preservando a ordem do resultado.
 *
 *  Existe porque resolver o imdb_id de umas quarenta chamadas de uma vez
 *  convida o 429 do TMDB, e serializar tudo deixaria a home fria lenta
 *  sem necessidade. */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const resultados = new Array<R>(items.length)
  let proximo = 0

  async function trabalhador(): Promise<void> {
    for (;;) {
      const indice = proximo++
      if (indice >= items.length) return
      resultados[indice] = await fn(items[indice], indice)
    }
  }

  const quantos = Math.min(Math.max(limit, 1), items.length)
  await Promise.all(Array.from({ length: quantos }, () => trabalhador()))

  return resultados
}
