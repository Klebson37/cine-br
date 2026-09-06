# CineBR

Catálogo de filmes que mostra apenas o que está incluído nos streamings que você já assina, no Brasil.

## Rodando localmente

1. `npm install`
2. Copie `.env.local.example` para `.env.local`
3. Preencha `TMDB_ACCESS_TOKEN` com o Read Access Token v4 de https://www.themoviedb.org/settings/api
4. `npm run dev`

## Testes

- `npm test` — unitários (Vitest)
- `npm run test:e2e` — ponta a ponta (Playwright, precisa do token)

## Documentação

- Design: [`docs/superpowers/specs/2026-09-06-catalogo-filmes-streaming-design.md`](docs/superpowers/specs/2026-09-06-catalogo-filmes-streaming-design.md)
- Plano: [`docs/superpowers/plans/2026-09-06-catalogo-filmes-streaming.md`](docs/superpowers/plans/2026-09-06-catalogo-filmes-streaming.md)

## Créditos

Este site usa o TMDB e as APIs do TMDB, mas não é endossado, certificado ou de outra forma aprovado pelo TMDB.

Dados de disponibilidade em streaming fornecidos por JustWatch.
