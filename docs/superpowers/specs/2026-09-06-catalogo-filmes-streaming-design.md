# Catálogo de filmes por streaming — design da fase 1

**Data:** 2026-09-06
**Status:** aprovado para implementação
**Escopo:** fase 1 (navegação do catálogo). A fase 2 — contas de usuário, favoritos e assistidos — tem spec próprio, ainda não escrito.

## Problema

O TMDB já oferece um catálogo de filmes público e gratuito. Um clone dele não tem razão de existir. O problema que este app resolve é outro e mais específico: **descobrir um filme interessante e só então descobrir que ele custa R$ 14,90 de aluguel.**

O app mostra apenas o que está incluído nas assinaturas que a pessoa já paga. O usuário marca uma vez quais serviços assina; a partir daí, todo filme exibido é assistível sem gasto adicional.

Recorte deliberado: **somente Brasil**. Todas as consultas usam `watch_region=BR` e `language=pt-BR`.

## Decisões de produto

| Decisão | Escolha | Motivo |
|---|---|---|
| Natureza | Projeto de curso/portfólio, com qualidade de produção | Código apresentável, sem compromisso de sustentar usuários reais |
| Plataforma | Web | A chave da API fica protegida no servidor; o link abre para qualquer pessoa sem loja de aplicativos |
| Região | Brasil apenas | Disponibilidade em streaming é por país; suportar vários multiplicaria o escopo sem agregar ao objetivo |
| Estado do usuário | Cookie | Cobre o caso de uso inteiro sem banco de dados |
| Contas de usuário | Fora da fase 1 | Ver "Costuras previstas" |

## Stack

- **Next.js** (App Router) com **React** e **TypeScript**
- **Tailwind CSS**
- **Vitest** para testes unitários, **Playwright** para um teste de ponta a ponta
- Deploy na **Vercel**

O App Router não é escolha estética: Server Components são o que mantém a chave da API fora do navegador sem exigir um backend separado.

## Telas

Três rotas. O seletor de streamings deliberadamente **não** é uma delas.

### `/` — Catálogo

Tela principal, com **dois modos de exibição**. O modo é derivado dos filtros ativos, não de um botão.

#### Modo descoberta — padrão, sem filtro de gênero, ordenação ou busca

Ordem vertical:

1. **Destaque** — um filme em evidência no topo, com imagem panorâmica, título, nota e sinopse curta. Dá o clima de catálogo de streaming na primeira dobra.
2. **Barra de filtros** — fixa, com os streamings selecionados, gênero e ordenação
3. **Fileiras horizontais** — três a quatro, roláveis lateralmente

As fileiras são:

| Fileira | Consulta | Observação |
|---|---|---|
| Populares nos seus streamings | `/discover/movie` com `sort_by=popularity.desc` e todos os provedores marcados | Ver "Por que não usamos `/trending`" |
| Na Netflix | `/discover/movie` com `with_watch_providers` de um provedor só | Uma fileira por serviço marcado |
| No Prime Video | idem | |
| No Disney+ | idem | |

O número de fileiras acompanha quantos serviços a pessoa marcou. Marcou três, três fileiras de serviço mais a de populares. Marcou nenhum, aparece só a de populares, sobre o catálogo geral do Brasil.

Isso produz um comportamento que vale de propósito, não de acaso: **desmarcar um serviço faz a fileira dele desaparecer**. A interface demonstra a própria premissa do app.

Teto de requisições no modo descoberta: **cinco chamadas paralelas** (uma de populares mais até quatro de serviços), todas com cache de uma hora. O app impõe o limite de quatro serviços por vez no seletor para que esse teto não cresça.

#### Modo filtrado — gênero, ordenação ou busca ativa

O destaque e as fileiras somem. Fica a barra de filtros sobre uma **grade única** paginada, carregando mais conforme a rolagem. **Uma requisição.**

Fileiras por serviço deixam de fazer sentido quando já há filtro de gênero: seriam quatro chamadas para mostrar recortes cada vez mais estreitos, muitos deles vazios. Uma pergunta dirigida ("terror na minha assinatura") merece uma lista direta, não quatro carrosséis pela metade.

#### Por que não usamos `/trending`

O endpoint `/trending/movie/{time_window}` aceita apenas `time_window` e `language`. **Não aceita `watch_region` nem `with_watch_providers`.**

Uma fileira "Em alta esta semana" alimentada por ele mostraria filmes fora das assinaturas do usuário — a primeira fileira da home contradizendo a promessa do app. Por isso "populares" vem do `/discover` com `sort_by=popularity.desc` e o filtro de provedores aplicado. É menos preciso que o trending real e é honesto.

#### O destaque não custa requisição

Ele sai do **primeiro item da fileira de populares**, que já chega ordenada por popularidade, com pôster, imagem panorâmica, sinopse e nota. A fileira renderiza a partir do segundo item.

#### Descartado: fileira de "lançamentos recentes nos streamings"

Foi considerada e é **impossível** na API do TMDB. Todos os parâmetros de data do `/discover` — `primary_release_date`, `release_date`, `year`, `primary_release_year` — se referem à data de lançamento do filme, nunca à data de entrada no catálogo do streaming. Nenhuma das catorze opções de `sort_by` cobre isso.

A informação pertence ao JustWatch, e o TMDB expõe apenas o estado atual de disponibilidade, não o histórico.

Existe um substituto: `primary_release_date.desc` com filtro de provedor traz filmes lançados há pouco que estão nos streamings. Não é a mesma coisa, e exige `vote_count.gte` para não encher o topo de títulos obscuros. Fica fora da fase 1.

#### Descartado: painel de filtros lateral

Obriga a construir dois layouts, um deles só para o celular, e transmite sensação de busca de e-commerce em vez de catálogo de cinema.

### `/movie/[id]` — Detalhe

Conteúdo da página, de cima para baixo:

1. **Cabeçalho** — pôster, título, ano, sinopse
2. **Ficha** — nota do TMDB e duração
3. **Onde assistir** — o bloco central do app
4. **Trailer** — player do YouTube embutido
5. **Elenco principal** — fotos e nomes, em carrossel

#### Onde assistir

Separa visualmente três coisas que costumam vir misturadas:

1. **Incluído na sua assinatura** (`flatrate`) — em destaque
2. **Aluguel** (`rent`)
3. **Compra** (`buy`)

Essa separação é a proposta do app em miniatura.

#### Uma requisição para a página inteira

O parâmetro `append_to_response` do `/movie/{id}` aceita, nas palavras da documentação, *"comma separated list of endpoints within this namespace, 20 items max"*. Elenco e trailer entram de carona na chamada de detalhe:

```
/movie/{id}?append_to_response=credits,videos&language=pt-BR
```

Nenhuma requisição adicional para os itens 4 e 5. O custo deles é de interface, não de rede.

`/movie/{id}/watch/providers` é um endpoint dentro do mesmo namespace, então pela regra documentada deveria ser anexável da mesma forma, deixando a página inteira em uma requisição. A documentação não confirma o caso de caminhos com barra de forma explícita. **Validar no início da implementação:** se funcionar, uma requisição; se não, duas. Nada no design depende do resultado.

#### Trailer: o filtro de idioma esconde a maioria dos vídeos

O TMDB filtra vídeos por idioma. Pedindo apenas `language=pt-BR`, muitos filmes voltam com a lista de vídeos vazia, porque o trailer cadastrado é o original em inglês — e a página pareceria não ter trailer para metade do catálogo.

A consulta usa `include_video_language=pt,en,null` e escolhe nesta ordem:

1. Vídeo do tipo `Trailer` em português
2. Vídeo do tipo `Trailer` em inglês
3. Qualquer vídeo do tipo `Teaser`

Sem nenhum dos três, **a seção inteira é omitida** — nada de moldura de player vazia.

#### Descartado: filmes parecidos

`/movie/{id}/recommendations` aceita apenas `language`, `page` e o id do filme. **Não aceita `with_watch_providers` nem `watch_region`.**

O resultado seria o app trabalhando contra si mesmo no momento de maior intenção do usuário: numa página de filme que a pessoa pode assistir, sugerir cinco filmes parecidos que ela não pode. É a mesma limitação que tira o `/trending` da home.

Consertar exigiria buscar a disponibilidade de cada recomendação, uma requisição por filme — o mesmo custo que a busca paga. Não se justifica na fase 1.

### `/search?q=` — Busca

Busca por título. **Atenção — restrição da API:** o endpoint `/search/movie` aceita apenas `query`, `include_adult`, `language`, `primary_release_year`, `page`, `region` e `year`. Ele **não** aceita `with_watch_providers`. A busca, portanto, não pode ser filtrada por streaming na origem.

Solução adotada: a busca devolve todos os títulos que casam, e o app resolve a disponibilidade dos resultados da página atual (20 itens) em paralelo, via `/movie/{id}/watch/providers`, com o mesmo cache de 6 horas do restante. Cada cartão recebe um selo:

- **Na sua assinatura** — está em um dos serviços marcados
- **Aluguel ou compra** — disponível no Brasil, mas pago à parte
- **Indisponível no Brasil**

Um interruptor "somente nos meus streamings" esconde os que não estão incluídos.

Decisão deliberada: por padrão a busca **não descarta** resultados em silêncio. Quem procura um título específico quer saber que ele existe e que não está disponível — receber "nenhum resultado" para um filme que existe seria pior que a resposta honesta. O descarte só acontece quando a pessoa liga o interruptor.

Custo aceito: a primeira busca por um termo novo dispara até 20 requisições paralelas de disponibilidade. Com o limite do TMDB em torno de 40 por segundo e o cache de 6 horas, isso é seguro. É o único ponto do app que foge do padrão de uma requisição por tela, e a causa é limitação da API, não escolha de design.

### Elementos persistentes

- **Header:** logo, campo de busca, botão "Meus streamings (N)" que abre um painel lateral
- **Rodapé:** logo do TMDB, aviso de não-endosso e crédito ao JustWatch (ver "Obrigações legais")

**Primeira visita:** o app não bloqueia com assistente de configuração. Mostra o catálogo geral já populado e convida discretamente a escolher os serviços. O usuário vê valor antes de ser cobrado por configuração.

## Arquitetura

### Segredo

A chave é o **Read Access Token v4** do TMDB, na variável de ambiente `TMDB_ACCESS_TOKEN`, enviada como `Bearer`. Lida exclusivamente por Server Components e Server Actions. O navegador nunca a recebe, e não existe rota de API própria que a exponha.

### Fronteira entre TMDB e domínio

Um único módulo conversa com o TMDB. O resto do app não sabe que o TMDB existe.

```
lib/
  tmdb/client.ts      ← único ponto com o token, a URL base, language=pt-BR, watch_region=BR
  tmdb/schema.ts      ← tipos do JSON cru (poster_path, vote_average, release_date...)
  catalog/types.ts    ← domínio: Movie, Provider, Availability
  catalog/mappers.ts  ← traduz TMDB → domínio
  catalog/queries.ts  ← discoverMovies(), getMovie(), searchMovies()
  preferences.ts      ← lê e grava o cookie dos streamings
```

Nenhum componente toca em `poster_path` ou `vote_average`. Todos recebem `posterUrl` e `rating`, já prontos.

O tipo `Movie` inclui `backdropUrl` além de `posterUrl` — o destaque da home usa a imagem panorâmica (`backdrop_path`), não o pôster vertical. Como `backdrop_path` vem nulo com alguma frequência, o mapper precisa tratar esse caso; a regra está em "Estados da interface".

Essa fronteira existe para a fase 2. Quando o banco entrar, `isFavorite` e `watchedAt` passam a ser campos de `Movie` alimentados por outra fonte, e os componentes não mudam. Sem ela, favoritar um filme viraria refatoração geral.

### Estrutura de arquivos

```
app/
  page.tsx              ← catálogo
  movie/[id]/page.tsx   ← detalhe
  search/page.tsx       ← busca
  actions.ts            ← Server Action que grava o cookie
components/
  catalog/  FeaturedMovie, MovieRail, MovieGrid, MovieCard
  filters/  FilterBar, ProviderPanel
  movie/    WhereToWatch, Trailer, CastList
  layout/   Header, Footer
```

Convenção: identificadores de código em inglês, interface e documentação em português.

### Endpoints do TMDB

| Uso | Endpoint | Parâmetros relevantes |
|---|---|---|
| Fileira de populares e grade filtrada | `/discover/movie` | `with_watch_providers`, `watch_region=BR`, `with_watch_monetization_types=flatrate`, `with_genres`, `sort_by` |
| Fileira de um serviço | `/discover/movie` | idem, com `with_watch_providers` de um único provedor |
| Lista de streamings do Brasil | `/watch/providers/movie` | `watch_region=BR` |
| Detalhe do filme | `/movie/{id}` | `append_to_response=credits,videos`, `include_video_language=pt,en,null` |
| Disponibilidade | `/movie/{id}/watch/providers` | — |
| Busca | `/search/movie` | `query` |

`with_watch_providers` e `watch_region` são interdependentes: um exige o outro. Vários provedores são combinados com pipe (`|`, OU); vírgula significa E, que não é o que queremos — o usuário quer filmes em **qualquer** dos serviços que assina, não em todos simultaneamente.

`with_watch_monetization_types=flatrate` é o que elimina aluguel e compra da home.

**`/trending/movie` não é usado.** Aceita apenas `time_window` e `language`, sem `watch_region` ou `with_watch_providers`, então devolveria filmes fora das assinaturas do usuário. A fileira de populares usa `/discover` com `sort_by=popularity.desc`.

**Nenhum endpoint informa data de entrada em catálogo.** Todos os parâmetros de data do `/discover` tratam da data de lançamento do filme. Fileiras do tipo "acabou de chegar na Netflix" não são construíveis com esta API.

### Preferências do usuário

O cookie guarda os IDs numéricos dos provedores escolhidos. A página o lê no servidor via `cookies()` e monta a consulta correta antes de renderizar — a primeira pintura da tela já sai certa, sem piscar.

`localStorage` foi descartado justamente por isso: o servidor não o enxerga, então a página nasceria vazia e só se corrigiria depois que o JavaScript rodasse.

Trocar de streaming dispara uma Server Action que regrava o cookie e revalida a rota.

Consequência aceita: as preferências ficam presas ao navegador. Trocando de aparelho, o usuário escolhe de novo — cinco toques, uma vez. A sincronia entre dispositivos chega na fase 2, junto com as contas.

### Cache

| Dado | Revalidação | Motivo |
|---|---|---|
| Lista de provedores do Brasil | 24 horas | Muda raras vezes por ano |
| Fileiras e grade do catálogo | 1 hora | Popularidade muda devagar |
| Detalhe do filme | 24 horas | Sinopse e elenco são praticamente estáticos |
| Disponibilidade | 6 horas | Catálogos de streaming mudam, mas não de hora em hora |

O limite do TMDB fica em torno de 40 requisições por segundo, com resposta `429` ao ser ultrapassado. Com esses tempos, o app opera com folga enorme.

## Estados da interface

### Vazio é o estado mais importante

Quatro streamings marcados, gênero terror, ano 2026: zero resultados. Isso vai acontecer com frequência.

A grade vazia **nunca** aparece em branco. Ela explica e oferece saída: *"Nenhum filme com esses filtros. Tente remover o ano ou incluir mais streamings."*, com um botão que remove o filtro mais restritivo.

Na tela de detalhe, `/movie/{id}/watch/providers` frequentemente **não traz a chave `BR`**. Isso é resposta legítima, não falha: o bloco exibe *"Não está em nenhum streaming no Brasil no momento."*

Nenhum streaming selecionado também não é erro — mostra o catálogo geral.

**O destaque tem dois casos próprios:**

- **Zero resultados** — não há primeiro item, então o destaque simplesmente não é renderizado. A tela mostra a barra de filtros e a mensagem de vazio. O destaque nunca aparece com moldura vazia.
- **Filme sem `backdrop_path`** — acontece com frequência em títulos menos populares. O destaque cai para o pôster vertical com fundo desfocado. Se também não houver pôster, o destaque é omitido e a fileira começa do primeiro item, sem buraco no layout.

**Fileira vazia não é renderizada.** Se a consulta de um serviço voltar sem resultados, a fileira inteira — título incluído — é omitida. Um carrossel vazio rotulado "Na Netflix" comunica erro mesmo quando não há erro.

**Fileira que falha isoladamente não derruba a home.** As fileiras são buscadas em paralelo e renderizadas de forma independente. Se a consulta do Prime Video falhar enquanto as demais respondem, o app mostra as que deram certo e omite a que falhou, em vez de trocar a página inteira por uma tela de erro.

### Falhas

Tratadas em três níveis:

1. **`client.ts`** — nova tentativa com espera crescente em `429` e `5xx`
2. **Rota de detalhe** — `notFound()` em `404`
3. **Error boundary por rota** — "não conseguimos carregar agora", com botão de tentar de novo

Nenhum caminho termina em tela branca.

### Carregamento

`Suspense` com esqueleto da grade. Cabeçalho e filtros aparecem imediatamente; os pôsteres preenchem em seguida.

## Testes

**Vitest, cobrindo onde os bugs realmente moram:**

- **Mappers** — funções puras, o ponto de maior retorno: `poster_path` nulo, data de lançamento vazia, nota zero
- **Montagem da consulta ao `/discover`** — múltiplos provedores viram pipe, `watch_region=BR` nunca é omitido, filtro vazio não gera parâmetro inválido
- **Cookie de preferências** — leitura, escrita e o caso de cookie corrompido
- **A regra que decide o modo da home** — sem filtro de gênero, ordenação ou busca, é descoberta; com qualquer um deles, é grade. É uma função pura sobre os parâmetros da URL e determina o que a tela inteira faz
- **A montagem das fileiras** — quantos serviços marcados geram quantas fileiras, e o descarte de fileiras vazias

**Playwright, um único teste de ponta a ponta** no fluxo que importa: abrir o catálogo, escolher a Netflix, ver a grade mudar, clicar num filme, ver o bloco de disponibilidade.

**Fora do escopo de testes:** snapshots de componentes visuais. Quebram a cada ajuste de Tailwind e não pegam bug real.

As respostas do TMDB ficam como fixtures JSON. Nenhum teste toca a rede.

## Obrigações legais

Não são opcionais e entram desde a primeira versão, no rodapé.

**JustWatch.** A documentação do endpoint de provedores é explícita: *"In order to use this data you must attribute the source of the data as JustWatch. If we find any usage not complying with these terms we will revoke access to the API."* É condição de acesso, não recomendação.

**TMDB.** Exige o logo — menos proeminente que a marca do próprio app — e a frase: *"Este site usa o TMDB e as APIs do TMDB, mas não é endossado, certificado ou de outra forma aprovado pelo TMDB."*

## Costuras previstas para a fase 2

A fase 2 traz login, cadastro, favoritos e assistidos, sobre Supabase. O design atual já reserva o encaixe:

- **Header** — o botão de login entra ao lado de "Meus streamings", sem redesenho
- **Tipo `Movie`** — ganha `isFavorite` e `watchedAt`, preenchidos em `catalog/queries.ts` a partir de uma segunda fonte; os componentes não mudam
- **Preferências** — `preferences.ts` passa a ler do banco quando houver sessão, mantendo o cookie como caminho para visitantes anônimos
- **Rotas novas** — `/favorites` e `/watched`, reaproveitando `MovieGrid` inteiro

Nada disso é construído agora.

## Fora do escopo da fase 1

Registrado para evitar ambiguidade:

- Contas, login e cadastro
- Favoritos e lista de assistidos
- Séries — só filmes
- Filmes parecidos na página de detalhe — a API não permite filtrar recomendações por streaming, e sugerir o que a pessoa não pode assistir contradiz o app
- Regiões fora do Brasil
- Notificações de "entrou no catálogo"
- Recomendação personalizada
- Aplicativo mobile nativo
