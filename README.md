# CineBR

Catálogo de filmes que mostra apenas o que está incluído nos streamings que você já assina, no Brasil.

Além de filtrar por serviço, gênero e ordenação, dá para exigir uma **nota mínima do IMDb** — "só filmes com 8 ou mais". O filtro vale também nas fileiras da home: escolher uma nota mantém o modo descoberta, com destaque e carrosséis, em vez de virar uma lista.

## Rodando localmente

1. `npm install`
2. Copie `.env.local.example` para `.env.local`
3. Preencha `TMDB_ACCESS_TOKEN` com o Read Access Token v4 de https://www.themoviedb.org/settings/api
4. Crie um projeto no [Supabase](https://supabase.com), rode a migração da
   tabela `marks` descrita em
   [`docs/superpowers/specs/2026-09-06-contas-e-listas-design.md`](docs/superpowers/specs/2026-09-06-contas-e-listas-design.md)
   e preencha `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. No Supabase, em Authentication → Providers, ative o Google com credenciais
   OAuth do Google Cloud, e autorize `http://localhost:3000/auth/callback`
6. `npm run dev`

O `npm run dev` e o `npm run build` disparam antes o `npm run build:imdb`, que baixa o dataset de notas do IMDb e grava `data/imdb-ratings.bin`. A primeira execução leva alguns segundos e baixa ~7 MB; depois disso o script não faz nada enquanto o arquivo tiver menos de sete dias. O arquivo é gerado, não versionado — `data/` está no `.gitignore`.

Requer **Node 22.18 ou superior**: o script de build é um `.mts` executado com o type stripping nativo do Node.

## Como o filtro de nota funciona

O `/discover` do TMDB não devolve `imdb_id`, e o dataset do IMDb só sabe consultar por `tconst`. Ligar as duas pontas custa uma requisição por filme, o que seria inviável nas cinco fileiras da home. Três medidas derrubam esse custo:

- **Pré-filtro no TMDB** — o `/discover` já vai com `vote_average.gte` meio ponto abaixo do limite pedido e `vote_count.gte=200`, o que corta a maioria dos reprovados sem custo nenhum
- **Deduplicação** — um filme aparece na fileira de populares e na do serviço dele; os ids são reunidos num conjunto único antes de resolver o `imdb_id`
- **Cache de 24h** com concorrência limitada a 8 chamadas simultâneas

Filme sem nota conhecida **sai** da lista: se o filtro diz "8 ou mais", tudo que aparece tem nota comprovada. Como consequência, uma fileira pode ficar curta — ela mostra o que existe acima da nota naquele serviço, sem completar com filmes piores.

Limitação assumida: a folga de meio ponto é uma heurística, o `imdb_id` do TMDB tem buracos e o dataset descarta títulos com menos de mil votos. Somados, isso faz "8 ou mais" mostrar **menos** filmes do que a resposta perfeita mostraria — o erro escolhido é deixar um filme bom de fora, não deixar um filme ruim entrar.

## Contas e listas

Com uma conta — login pelo Google — dá para marcar filmes como **quero
assistir** ou **já assisti**, e navegar pelas duas listas nas abas da home.
Cada filme tem um estado só: marcar como assistido tira de "quero assistir".

Sem conta, o site inteiro continua funcionando. Só as listas pedem login.

As marcações ficam no Postgres do Supabase, com Row Level Security: a regra
de que cada pessoa só enxerga as próprias linhas vive no banco, não apenas no
código da aplicação.

## Testes

- `npm test` — unitários (Vitest)
- `npm run test:e2e` — ponta a ponta (Playwright, precisa do token)

## Documentação

- Design do catálogo: [`docs/superpowers/specs/2026-09-06-catalogo-filmes-streaming-design.md`](docs/superpowers/specs/2026-09-06-catalogo-filmes-streaming-design.md)
- Plano do catálogo: [`docs/superpowers/plans/2026-09-06-catalogo-filmes-streaming.md`](docs/superpowers/plans/2026-09-06-catalogo-filmes-streaming.md)
- Design do filtro de nota: [`docs/superpowers/specs/2026-09-06-filtro-nota-imdb-design.md`](docs/superpowers/specs/2026-09-06-filtro-nota-imdb-design.md)
- Plano do filtro de nota: [`docs/superpowers/plans/2026-09-06-filtro-nota-imdb.md`](docs/superpowers/plans/2026-09-06-filtro-nota-imdb.md)

## Créditos

Este site usa o TMDB e as APIs do TMDB, mas não é endossado, certificado ou de outra forma aprovado pelo TMDB.

Dados de disponibilidade em streaming fornecidos por JustWatch.

As notas vêm dos [IMDb Non-Commercial Datasets](https://developer.imdb.com/non-commercial-datasets/). Informação cortesia do IMDb (https://www.imdb.com), usada sob permissão apenas para fins não comerciais. Este projeto não é afiliado ao IMDb.
