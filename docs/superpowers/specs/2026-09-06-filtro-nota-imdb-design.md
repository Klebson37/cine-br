# Filtro por nota do IMDb — design

**Data:** 2026-09-06
**Status:** aguardando revisão
**Escopo:** filtro de nota mínima do IMDb na home, valendo no modo descoberta e no modo filtrado. Não cobre a busca.

## Problema

A home mostra o que está incluído nas assinaturas do usuário, mas não ajuda a separar o que vale a pena assistir do que apenas está lá. "O que tem de bom na minha Netflix" é uma pergunta diferente de "o que tem na minha Netflix", e hoje o app só responde a segunda.

O filtro pedido: **nota mínima do IMDb**, por exemplo "só filmes acima de 8".

## Decisões de produto

| Decisão | Escolha | Motivo |
|---|---|---|
| Fonte da nota | IMDb real, não o `vote_average` do TMDB | Decisão explícita do usuário. A nota do TMDB estava disponível de graça e foi recusada |
| Onde vale | Fileiras da descoberta **e** grade filtrada | O filtro precisa aparecer onde a pessoa navega, não só onde ela pesquisa |
| Nota sozinha | Mantém o modo descoberta | Se levasse à grade, o filtro nunca apareceria nas fileiras |
| Fileira que encolhe | Fica curta mesmo | Mostra literalmente o que existe acima da nota naquele serviço |
| Filme sem nota | Sai da lista | Ausência de informação não satisfaz um limite. Coerente com `rating: null` em `types.ts` |
| Controle na interface | `<select>` com faixas fixas | O formulário de filtros é um GET puro sem JavaScript e deve continuar sendo |
| Exibir a nota do IMDb no cartão | Não | Não foi pedido |

## Restrição que governa o desenho

O `/discover/movie` do TMDB **não devolve `imdb_id`**, e o dataset do IMDb só sabe consultar por `tconst`. Ligar as duas pontas custa uma requisição por filme.

No modo descoberta são 5 fileiras × 20 filmes ≈ 100 filmes por render. Sem mitigação, isso seria ~100 requisições extras em toda home fria. Todo o desenho abaixo existe para derrubar esse número.

## Arquitetura

### Fonte das notas: dataset, não API

`https://datasets.imdbws.com/title.ratings.tsv.gz` traz `tconst`, `averageRating` e `numVotes` de todos os títulos (~1,5 milhão de linhas, ~7 MB comprimidos). Uso não comercial, que é o caso deste projeto.

Uma API por filme (OMDb) foi descartada: com o filtro valendo nas fileiras seriam ~200 requisições por carregamento da home e a cota gratuita de 1.000/dia acabaria em cinco visitas.

**`scripts/build-imdb-ratings.mjs`**, rodando em `predev` e `prebuild`:

1. Baixa o `.tsv.gz`
2. Descomprime com `zlib` (embutido no Node, sem dependência nova)
3. Descarta toda linha com `numVotes < 1000`
4. Grava `data/imdb-ratings.bin`

O corte de 1.000 votos faz três coisas de uma vez: derruba ~1,5 milhão de linhas para ~150 mil, tira a memória de ~200 MB para menos de 1 MB, e elimina de graça o filme com nota 9,4 e doze votos que poluiria qualquer filtro de nota alta.

**Formato de `data/imdb-ratings.bin`:**

```
[0..3]                 Uint32   quantidade de títulos (N)
[4 .. 4+4N)            Int32[N] parte numérica do tconst, ordenada crescente
[4+4N .. 4+5N)         Uint8[N] nota × 10 (ex.: 8,4 vira 84)
```

`tt0111161` vira `111161`. Ordenado, a consulta é busca binária sobre um `Int32Array`: sem `Map`, sem laço de parse na inicialização, sem alocar 150 mil strings. O arquivo tem ~750 KB.

`data/` entra no `.gitignore`. O arquivo é gerado no build, não commitado — o repositório continua limpo e as notas se atualizam a cada deploy. O script não faz nada se o arquivo já existe e tem menos de sete dias, para não penalizar `npm run dev`.

### Redução de custo: pré-filtro no TMDB

O `/discover` passa a receber `vote_average.gte` **0,5 abaixo** do limite pedido, mais `vote_count.gte=200`. Pedir "IMDb acima de 8" manda `vote_average.gte=7.5` ao TMDB.

As duas notas correlacionam forte e o TMDB costuma ser a mais generosa das duas, então a folga de 0,5 para baixo é conservadora. Isso derruba os candidatos de 20 para tipicamente 5 a 8 por fileira, sem nenhum custo de requisição.

A folga é **0,5 fixo**. Calibrar por gênero ou por década é sintonia fina cara e impossível de provar melhor.

### Redução de custo: deduplicação entre fileiras

Um mesmo filme aparece na fileira de populares e na fileira do serviço dele. Os ids sobreviventes das cinco fileiras são reunidos num conjunto único **antes** de buscar `imdb_id`. Na prática, ~40 consultas em vez de ~100.

### Módulos

| Módulo | Responsabilidade | Depende de |
|---|---|---|
| `scripts/build-imdb-ratings.mjs` | Gerar `data/imdb-ratings.bin` | Nada do app |
| `lib/imdb/ratings.ts` | Carregar o arquivo uma vez; `getImdbRating(tconst): number \| null` | `fs`, o arquivo |
| `lib/catalog/rating-filter.ts` | Regras puras: `parseMinRating`, `prefilterVoteAverage`, `filterByImdbRating` | Nada |
| `lib/catalog/rated-discovery.ts` | Compor TMDB + IMDb: buscar fileiras, deduplicar, resolver `imdb_id`, filtrar | `queries.ts`, os dois acima |

`rated-discovery.ts` existe separado de propósito: `queries.ts` fala só TMDB, e misturar as duas fontes lá borraria a fronteira que o módulo mantém hoje.

`lib/imdb/ratings.ts` carrega o arquivo num singleton preguiçoso de módulo — a primeira consulta paga a leitura, as seguintes não. Não usa `instrumentation.ts` porque o custo é irrelevante e o acoplamento não se justifica.

## Fluxo de dados

Modo descoberta com `?rating=8`:

1. **5 chamadas paralelas** ao `/discover`, uma por fileira, agora com `vote_average.gte=7.5` e `vote_count.gte=200`. Cache de 1h, como hoje.
2. Os ids de todas as fileiras entram num `Set`.
3. **`/movie/{id}/external_ids`** para cada id do conjunto, em paralelo com **concorrência limitada a 8**, via o `tmdbFetch` existente com `CACHE.detail` (24h). Home quente: zero requisições.
4. Cada `imdb_id` consulta `getImdbRating` em memória.
5. Cada fileira é filtrada **preservando a ordem original** — a ordem é a classificação por popularidade e reordenar faria a numeração mentir.
6. A fileira de ranking filtra **antes** de cortar em `TAMANHO_RANKING`: são os dez melhores colocados que sobreviveram ao filtro, não o que sobrar dos dez primeiros. Cortar antes de filtrar entregaria três filmes sob um título que promete dez.
7. O destaque sai do primeiro item da fileira de populares **já filtrada**.
8. Fileira que zera desaparece sozinha: `MovieRail` já retorna `null` para lista vazia.

### O título da fileira de ranking com filtro ativo

`buildRailSpecs` monta hoje o título "Os 10 mais populares nos seus streamings". Com filtro de nota a fileira pode entregar quatro filmes, e o título passaria a mentir — o mesmo cuidado que já levou o ranking a não remover o destaque do topo.

Com `rating` ativo, o título da fileira de populares perde o número: **"Os mais populares nos seus streamings"** (e "Os mais populares no Brasil" sem serviço marcado). `buildRailSpecs` recebe um parâmetro a mais para decidir isso, e o `TAMANHO_RANKING` continua valendo como teto.

Modo filtrado (`rating` junto com `genre` ou `sort`): mesmo pipeline, uma chamada de `/discover` só, resultado na grade única.

O limite de concorrência 8 protege contra o rate limit do TMDB sem serializar. Vale para o conjunto deduplicado inteiro, não por fileira.

## Interface

`FilterBar` ganha um terceiro `<select>`, ao lado de gênero e ordenação:

| `value` | Rótulo |
|---|---|
| *(vazio)* | Qualquer nota |
| `6` | Nota 6 ou mais |
| `7` | Nota 7 ou mais |
| `8` | Nota 8 ou mais |
| `9` | Nota 9 ou mais |

**A comparação é `imdbRating >= limite`.** Um filme com exatamente 8,0 entra em "Nota 8 ou mais". Os rótulos dizem "ou mais" e não "acima de" justamente para não prometer uma exclusão que a regra não faz.

`parseMinRating` aceita **somente** os valores `6`, `7`, `8` e `9`. Qualquer outra coisa vira `null`, ou seja, sem filtro — a lista é fechada em vez de validar faixa numérica porque a interface só oferece esses quatro e a URL é entrada não confiável.

Faixas fixas e não um slider porque o formulário é um GET puro sem JavaScript, e um slider exigiria estado no cliente para renderizar um valor que o servidor já sabe ler da URL.

`resolveHomeMode` passa a receber `rating` em `HomeParams`, mas **não o conta** como filtro que troca de modo:

- só `rating` → descoberta, com destaque e fileiras filtrados
- `rating` + `genre` ou `sort` → grade única, com a nota somada aos outros filtros

Isso é a regra que dá sentido a ter pedido o filtro nas fileiras, e por isso mora na função pura que já concentra a decisão de modo.

## Erros e degradação

| Situação | Comportamento |
|---|---|
| `external_ids` falha para um filme | O filme é tratado como sem nota e sai. A fileira continua |
| `imdb_id` ausente no TMDB | Mesma coisa: sai |
| `tconst` fora do dataset (menos de 1.000 votos, ou lançamento recente) | Sai |
| `?rating=abc`, `?rating=99`, `?rating=-1` | Ignorado, tratado como sem filtro |
| `data/imdb-ratings.bin` ausente | Erro claro apontando o script, no mesmo espírito da mensagem de `TMDB_ACCESS_TOKEN` ausente |
| `/discover` falha numa fileira | Comportamento atual preservado: fileira vira lista vazia e some |

**Limitação assumida, registrada de propósito:** somando os falsos negativos do pré-filtro de 0,5, os buracos do `imdb_id` no TMDB e o corte de 1.000 votos, "acima de 8" mostra menos filmes do que a resposta perfeita mostraria. Não é possível, olhando uma fileira curta, distinguir catálogo fraco de falha de mapeamento. É o erro certo para um filtro chamado "acima de 8": deixa um filme bom de fora em vez de deixar um filme ruim entrar.

## Testes

Vitest, seguindo o padrão de teste unitário por módulo que o repositório já usa:

- **`lib/catalog/rating-filter.test.ts`** — nota exatamente igual ao limite entra, `prefilterVoteAverage(8) === 7.5`, filme sem nota sai, ordem preservada, `parseMinRating` aceita só `6`-`9` e devolve `null` para o resto
- **`lib/catalog/rails.test.ts`** (existente, ampliado) — o título perde o "10" quando há filtro de nota e o mantém quando não há
- **`lib/imdb/ratings.test.ts`** — busca binária acerta o primeiro, o último e o meio; `tconst` ausente devolve `null`; `tconst` malformado devolve `null`
- **`lib/catalog/home-mode.test.ts`** (existente, ampliado) — `rating` sozinho mantém descoberta; `rating` com `genre` vira grade
- **`lib/catalog/rated-discovery.test.ts`** — deduplicação entre fileiras reduz as consultas; `external_ids` que rejeita não derruba a fileira; limite de concorrência respeitado
- **Playwright** — selecionar "Acima de 8" na home mantém as fileiras na tela

Os testes de `rating-filter` e `ratings` não tocam a rede. `rated-discovery` roda com `queries` e `ratings` dublados.

## Nota de implementação a verificar

Nesta versão do Next o cache de `fetch` é opt-in: `next: { revalidate: n }` define a vida útil, mas o comportamento padrão sem `cache` explícito merece conferência na primeira implementação do `external_ids`. Se o cache não engatar, o custo de home quente deixa de ser zero — que é a premissa de todo o desenho. Verificar antes de dar a tarefa por concluída; se necessário, somar `cache: 'force-cache'` no `tmdbFetch`.

## Arquivos tocados

**Novos:** `scripts/build-imdb-ratings.mjs`, `lib/imdb/ratings.ts`, `lib/catalog/rating-filter.ts`, `lib/catalog/rated-discovery.ts`, mais os três arquivos de teste.

**Alterados:** `lib/catalog/queries.ts` (`DiscoverOptions` ganha `minVoteAverage` e `minVoteCount`), `lib/catalog/home-mode.ts`, `lib/catalog/rails.ts` (título sem o "10" quando há filtro), `components/filters/FilterBar.tsx`, `app/page.tsx`, `package.json` (`predev`, `prebuild`), `.gitignore` (`data/`), mais os testes existentes de `home-mode` e `rails`.

## Fora do escopo

- Exibir a nota do IMDb no cartão ou na página de detalhe
- Filtrar a busca (`/search` não passa pelo `/discover`; exigiria desenho próprio)
- Calibrar a folga do pré-filtro por gênero ou década
- Buscar páginas extras para reencher fileiras magras
- Persistir a nota mínima em cookie, como os provedores
