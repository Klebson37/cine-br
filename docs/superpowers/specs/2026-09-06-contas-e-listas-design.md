# Contas e listas de filmes — design da fase 2

**Data:** 2026-09-06
**Status:** aguardando revisão
**Escopo:** contas com login pelo Google, marcação de filmes como "quero assistir" ou "já assisti", e três abas de navegação na home. Não cobre avaliação pessoal, notas próprias, listas compartilhadas nem recomendação.

## Problema

A fase 1 resolveu "o que posso assistir sem gastar a mais". Ela não resolve o que vem depois de encontrar: **a pessoa acha um filme bom, não tem tempo agora, e perde a informação.** Na visita seguinte recomeça do zero, e reencontra os mesmos filmes sem lembrar quais já viu.

Duas marcações resolvem isso: **quero assistir** e **já assisti**.

A spec da fase 1 previu este momento e deixou uma fronteira de tipos pronta para ele, registrando que "quando o banco entrar, `isFavorite` e `watchedAt` passam a ser campos de `Movie`". **Este design contraria essa previsão de propósito** — a justificativa está em "Por que as marcações não entram em `Movie`".

## Decisões de produto

| Decisão | Escolha | Motivo |
|---|---|---|
| Identidade | Login com Google | Nenhuma senha para criar, guardar ou recuperar; nenhum fluxo de "esqueci minha senha" para construir |
| Sem conta | Site inteiro funciona, menos as listas | Num portfólio, quem visita não cria conta — uma porta de login na frente do catálogo perde a visita |
| Estado do filme | Um só: sem marca, `want` ou `watched` | Marcar como assistido move o filme de aba sozinho, que é como as pessoas pensam |
| Disponibilidade nas listas | Mostra todos, com selo | A lista é da pessoa; um filme sumir dela porque saiu da Netflix parece defeito |
| Data de "assistido" | Fora de escopo | `updated_at` já ordena as listas; histórico completo é outra feature |
| Banco | Supabase | Autenticação e Postgres no mesmo serviço, com RLS |

## Restrição herdada

O app hoje **não tem banco nem contas**. O único estado do usuário é um cookie com os provedores selecionados, lido por [`readSelectedProviderIds`](lib/preferences.server.ts). Esse cookie **continua como está** — não migra para a conta. Misturar as duas fontes exigiria uma rotina de fusão com casos de conflito, e o ganho não paga.

## Arquitetura

### Banco de dados

Uma tabela:

```sql
create table public.marks (
  user_id    uuid        not null references auth.users(id) on delete cascade,
  movie_id   integer     not null,
  state      text        not null check (state in ('want', 'watched')),
  updated_at timestamptz not null default now(),
  primary key (user_id, movie_id)
);

create index marks_user_state_idx
  on public.marks (user_id, state, updated_at desc);
```

**A chave primária composta é a regra de negócio.** "Um estado por filme" não é validação da aplicação, é impossibilidade no banco: a mesma pessoa não consegue ter duas linhas do mesmo filme. Trocar `want` por `watched` é um `upsert`, não um delete seguido de insert.

`text` com `check` em vez de `enum`: dois valores não justificam o custo de alterar um tipo enumerado depois.

O índice cobre a consulta das abas — as marcações de uma pessoa, de um estado, mais recentes primeiro.

**Row Level Security ligada**, com quatro políticas:

```sql
alter table public.marks enable row level security;

create policy "le as proprias marcacoes"      on public.marks
  for select using (auth.uid() = user_id);
create policy "cria as proprias marcacoes"    on public.marks
  for insert with check (auth.uid() = user_id);
create policy "atualiza as proprias marcacoes" on public.marks
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "apaga as proprias marcacoes"   on public.marks
  for delete using (auth.uid() = user_id);
```

O isolamento entre pessoas fica no banco, não só no nosso código. Se uma consulta nossa esquecer o filtro por usuário, o Postgres recusa mesmo assim. Isso é o que torna seguro publicar a chave anônima do Supabase no navegador.

### A tabela guarda só o id do filme

Nada de cópia de título ou pôster. O [`getMovieDetail`](lib/catalog/queries.ts) já devolve título, pôster, ano **e disponibilidade numa requisição só**, com cache de 24h. Guardar uma cópia economizaria requisições, mas criaria dados que envelhecem — e, como as listas exibem selo de disponibilidade, a requisição por filme aconteceria de qualquer forma.

Custo de renderizar uma lista de N filmes: N chamadas ao `getMovieDetail`, com concorrência limitada a 8 pelo [`mapWithConcurrency`](lib/concurrency.ts) já existente, todas cacheadas 24h. Lista fria de 40 filmes: cinco rodadas, cerca de um a dois segundos. Lista quente: instantânea.

### Por que as marcações não entram em `Movie`

`Movie` é o tipo do domínio alimentado pelo TMDB. Marcação vem de outra fonte e é **por pessoa**.

Para `Movie` carregar `isFavorite`, toda função que devolve `Movie` precisaria receber o usuário — `discoverMovies`, `searchMovies` e `getMovieDetail` inclusive, que hoje não têm nenhuma noção de identidade. Isso enfiaria usuário na camada que fala com o TMDB, que é exatamente a fronteira que a fase 1 construiu com cuidado.

E abre uma porta perigosa: no dia em que alguém puser cache de resposta numa dessas funções, estado de um usuário passa a poder aparecer para outro. Hoje não vaza; o desenho é que convidaria o vazamento.

**Em vez disso:** a página busca os filmes como hoje e, em paralelo, uma consulta traz o `Map<movieId, MarkState>` da pessoa. O mapa desce pela árvore. É a mesma forma que já funcionou com o mapa de notas do IMDb no filtro de nota.

Quem não está logado recebe um mapa vazio. Nenhum componente precisa saber a diferença.

`getMarks()` traz **todas** as marcações da pessoa, não só as dos filmes daquela tela. Uma consulta por página, sem filtro por lista de ids, porque a quantidade é da ordem de dezenas ou centenas de linhas por pessoa — filtrar sairia mais caro em complexidade do que o que economizaria em tráfego.

### Autenticação

`@supabase/ssr`, com sessão em cookie — a única forma que funciona com Server Components, porque o servidor precisa ler a sessão para renderizar.

- `lib/supabase/server.ts` — cliente do servidor, montado sobre `cookies()`
- `lib/supabase/client.ts` — cliente do navegador, necessário só para disparar `signInWithOAuth`
- `app/auth/callback/route.ts` — recebe o retorno do Google e troca o código pela sessão

Duas variáveis de ambiente, **públicas por natureza**: `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Quem protege os dados é a RLS, não o segredo da chave — ao contrário do `TMDB_ACCESS_TOKEN`, que continua exclusivo do servidor.

Duas dependências novas: `@supabase/ssr` e `@supabase/supabase-js`. São as primeiras do projeto além do Next e do React, e não há como evitá-las.

## Módulos

| Módulo | Responsabilidade |
|---|---|
| `lib/supabase/server.ts` *(novo)* | Cliente do Supabase no servidor |
| `lib/supabase/client.ts` *(novo)* | Cliente do Supabase no navegador |
| `lib/marks/types.ts` *(novo)* | `MarkState = 'want' \| 'watched'` e os rótulos em português |
| `lib/marks/queries.ts` *(novo)* | `getMarks()`, `listMarkedIds(state)` |
| `components/catalog/MovieCard.tsx` *(alterar)* | Raiz vira `div` para o botão não ficar dentro do link |
| `components/catalog/MovieGrid.tsx` *(alterar)* | Prop opcional com o mapa de disponibilidade |
| `app/actions.ts` *(alterar)* | `setMark` — a Server Action de marcar |
| `components/catalog/MarkButton.tsx` *(novo)* | O botão, nos três estados, mais o estado anônimo |
| `components/layout/ListTabs.tsx` *(novo)* | A navegação em abas |
| `components/layout/AuthButton.tsx` *(novo)* | "Entrar" ou nome e "Sair" |

## Fluxo de dados

**Marcar um filme:**

1. O `MarkButton` é um formulário com Server Action — funciona sem JavaScript, como o resto do site
2. `setMark` recebe `movieId` e o estado desejado
3. Sem sessão, redireciona para o login em vez de gravar
4. `'want'` ou `'watched'` fazem `upsert`; `'none'` apaga a linha
5. `revalidatePath` na rota atual, no mesmo padrão do [`saveProviders`](app/actions.ts)

**Renderizar uma aba de lista:**

1. `listMarkedIds('want')` — os ids da pessoa, mais recentes primeiro
2. `mapWithConcurrency(ids, 8, getMovieDetail)` — os filmes com disponibilidade junto
3. `classifyAvailability` de [`search-availability.ts`](lib/catalog/search-availability.ts), reaproveitado, produz o selo de cada um
4. `MovieGrid` recebe os filmes e um `Map<movieId, AvailabilityLabel>`

`MovieGrid` ganha uma prop opcional com esse mapa. `MovieCard` já aceita `availability` — nada muda nele por causa disso.

## Interface

### Abas

Três: **Descobrir · Quero assistir · Já assisti**.

São **rotas próprias** — `/`, `/quero-assistir`, `/assisti` — com a navegação estilizada como abas. Parece aba para quem usa, mas cada lista ganha o próprio `loading.tsx` e `error.tsx`, e a home não vira uma página com modos combinados: ela já tem dois, descoberta e filtrado.

As abas aparecem nas três rotas, logo abaixo do cabeçalho. Para quem não está logado, "Quero assistir" e "Já assisti" continuam visíveis e clicáveis — a página abre convidando a entrar. Esconder as abas de quem não tem conta esconderia justamente a razão de criar uma.

### O botão de marcar

Sobre o pôster no `MovieCard`, e na página de detalhe.

| Estado | O que mostra | O clique faz |
|---|---|---|
| Sem marca | Contorno discreto, "Quero assistir" | Marca como `want` |
| `want` | Aceso, "Quero assistir" | Passa para `watched` |
| `watched` | Marca de conferido, "Já assisti" | Remove a marca |
| Anônimo | Igual ao "sem marca" | Leva ao login |

O ciclo de três passos evita um segundo controle no cartão. A página de detalhe, que tem espaço, mostra os dois estados como botões separados. São o mesmo componente com duas formas: `MarkButton` recebe uma prop `variant` que vale `'card'` ou `'detail'`.

### O cartão precisa mudar de estrutura

Hoje o [`MovieCard`](components/catalog/MovieCard.tsx) tem um `<Link>` como elemento raiz, envolvendo pôster, título e ano. **O botão de marcar não pode ficar dentro dele.**

Um `<form>` dentro de um `<a>` é HTML inválido, e o navegador desmonta a árvore de um jeito imprevisível; um `<button>` dentro de um `<a>` é aninhamento de elementos interativos, que quebra a navegação por teclado e confunde leitores de tela. Nos dois casos, clicar em "marcar" navegaria para o filme junto.

A correção: a raiz do cartão passa a ser um `<div class="relative">`, com o `<Link>` cobrindo pôster e texto, e o `MarkButton` como **irmão** dele, posicionado sobre o pôster. Nenhuma mudança visual — mas é alteração estrutural num componente usado em todas as telas, e precisa dos testes existentes passando depois.

### Cabeçalho

O [`Header`](components/layout/Header.tsx) ganha o `AuthButton` ao lado de "Meus streamings": "Entrar" para quem está fora, o primeiro nome e "Sair" para quem está dentro.

### Listas vazias

O [`EmptyState`](components/catalog/EmptyState.tsx) existente, com texto próprio de cada caso: quem não tem conta lê um convite a entrar; quem tem conta e lista vazia lê o que fazer para preenchê-la.

## Erros e degradação

| Situação | Comportamento |
|---|---|
| Sem sessão ao ler marcações | `getMarks` devolve mapa vazio. Nada quebra, nada aparece marcado |
| Sem sessão ao gravar | `setMark` redireciona para o login em vez de falhar |
| Supabase fora do ar na leitura | Mapa vazio, e a página renderiza sem marcações. O catálogo não cai junto |
| Supabase fora do ar na gravação | O erro sobe para o `error.tsx` da rota — gravação que falha em silêncio é pior que erro visível |
| `getMovieDetail` falha para um filme da lista | Esse filme sai da grade; os outros aparecem. Mesmo espírito das fileiras da home |
| Filme apagado do TMDB | `getMovieDetail` devolve `null` e o filme some da lista. A linha continua no banco, sem incomodar |
| `movie_id` inválido chegando na action | Rejeitado antes do banco, como o `parseProviderCookie` já faz com lixo |

## Testes

- **`lib/marks/queries.test.ts`** — mapa vazio sem sessão; agrupa por estado; ordem por `updated_at` decrescente
- **`app/actions.test.ts`** (existente, ampliado) — `setMark` rejeita `movieId` não numérico; redireciona sem sessão; `'none'` apaga; `want` → `watched` é upsert
- **`components/catalog/MarkButton.test.tsx`** — os quatro estados nas duas formas; o anônimo aponta para o login
- **`components/catalog/MovieCard.test.tsx`** *(novo)* — o botão de marcar **não** está dentro do link, e o link continua levando ao filme
- **`components/layout/ListTabs.test.tsx`** — marca a aba ativa conforme a rota
- **Playwright** — as abas aparecem, e uma lista aberta sem conta convida a entrar

**Limitação registrada:** o teste de ponta a ponta **não cobre o fluxo logado**. Automatizar login do Google exige credenciais de teste e driblar a proteção anti-robô do próprio Google — trabalho desproporcional para este projeto. O caminho logado fica coberto por testes unitários com o cliente do Supabase dublado, mais conferência manual. Quem mexer nisto depois precisa saber que essa rede não existe.

## Configuração necessária

Passos fora do código, que precisam acontecer para o resto funcionar:

1. Criar o projeto no Supabase, na organização `aulan8nsupabase`
2. Criar credenciais OAuth no Google Cloud e registrá-las no Supabase
3. Autorizar as URLs de retorno: `localhost:3000` e o domínio da Vercel
4. Rodar a migração da tabela `marks` com as políticas
5. Preencher as duas variáveis novas no `.env.local` e na Vercel

## Fora de escopo

- Migrar o cookie de provedores para a conta
- Marcar filmes sem conta, com fusão ao entrar
- Nota pessoal, resenha ou data de quando assistiu
- Listas públicas ou compartilhadas
- Recomendação a partir do que foi assistido
- Apagar a conta pela interface
- Login por e-mail e senha ou link mágico
