# Contas e listas de filmes — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar ao CineBR contas com login pelo Google e duas listas por pessoa — "quero assistir" e "já assisti" — navegáveis por abas na home.

**Architecture:** Supabase carrega autenticação e Postgres no mesmo serviço, com Row Level Security garantindo no banco que cada pessoa só enxerga as próprias linhas. As marcações **não** entram no tipo `Movie`: cada página busca os filmes como hoje e, em paralelo, um `Map<movieId, MarkState>` que desce pela árvore — a mesma forma que o filtro de nota já usa com o mapa de notas do IMDb. Todo o fluxo de autenticação acontece no servidor, por Route Handlers e Server Actions, sem JavaScript no cliente.

**Tech Stack:** Next.js 16.3.4 (App Router, Server Components), React 19.2.8, TypeScript 5, Tailwind CSS 4, Supabase (`@supabase/ssr` + `@supabase/supabase-js`), Vitest 5 (jsdom), Playwright 1.63.

**Spec:** [`docs/superpowers/specs/2026-09-06-contas-e-listas-design.md`](../specs/2026-09-06-contas-e-listas-design.md)

## Global Constraints

- **Idioma:** interface, comentários e mensagens de commit em português do Brasil. Mensagens de commit **sem acentos**, seguindo o histórico.
- **Identificadores de código em inglês**, interface e documentação em português — convenção declarada na spec da fase 1.
- **Um estado por filme:** `want` ou `watched`, nunca os dois. A chave primária composta `(user_id, movie_id)` é quem garante.
- **Sem conta, o site inteiro funciona**, menos as listas. Nenhuma rota exige login para renderizar.
- **RLS ligada na tabela `marks`**, com política para select, insert, update e delete, todas exigindo `auth.uid() = user_id`.
- **`NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` são públicas** por natureza; quem protege é a RLS. O `TMDB_ACCESS_TOKEN` continua exclusivo do servidor e **nunca** ganha prefixo `NEXT_PUBLIC_`.
- **O cookie de provedores não muda** e não migra para a conta.
- **`Movie` não ganha campos de usuário.** Nenhuma função de `lib/catalog/queries.ts` passa a receber usuário.
- **Nenhum matcher do jest-dom nos testes** — o projeto não os registra. Use `toBeDefined()`, `toBe()` e propriedades do DOM.
- Rodar `npm test` e `npm run lint` antes de cada commit.

## Desvio deliberado da spec

A spec previa `lib/supabase/client.ts`, um cliente de navegador, para disparar `signInWithOAuth`. **Este plano não o cria.** O login vira o Route Handler `/auth/login`, que monta a URL do Google no servidor e redireciona.

Motivo: elimina um módulo, elimina JavaScript no cliente e mantém a promessa do projeto de que os formulários funcionam sem JS — a mesma razão pela qual a barra de filtros é um GET puro. O resultado para quem usa é idêntico.

---

## Estrutura de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `lib/supabase/server.ts` *(novo)* | Cliente do Supabase no servidor, montado sobre `cookies()` |
| `lib/marks/types.ts` *(novo)* | `MarkState`, rótulos em português, `parseMarkState`, ciclo do botão |
| `lib/marks/queries.ts` *(novo)* | `getCurrentUser`, `getMarks`, `listMarkedIds` |
| `app/auth/login/route.ts` *(novo)* | Redireciona para o Google |
| `app/auth/callback/route.ts` *(novo)* | Troca o código pela sessão |
| `app/actions.ts` *(alterar)* | `setMark` e `signOut` |
| `components/catalog/MarkButton.tsx` *(novo)* | O botão, nas formas cartão e detalhe |
| `components/catalog/MarkedList.tsx` *(novo)* | Renderiza uma lista marcada; usada pelas duas rotas |
| `components/catalog/MovieCard.tsx` *(alterar)* | Raiz vira `div`; recebe o botão como irmão do link |
| `components/catalog/MovieGrid.tsx` *(alterar)* | Props opcionais de disponibilidade e marcações |
| `components/layout/ListTabs.tsx` *(novo)* | Navegação em abas |
| `components/layout/AuthButton.tsx` *(novo)* | "Entrar", ou nome e "Sair" |
| `components/layout/Header.tsx` *(alterar)* | Recebe o `AuthButton` |
| `app/quero-assistir/` *(novo)* | `page.tsx`, `loading.tsx`, `error.tsx` |
| `app/assisti/` *(novo)* | `page.tsx`, `loading.tsx`, `error.tsx` |
| `app/page.tsx` *(alterar)* | Abas e mapa de marcações |
| `app/movie/[id]/page.tsx` *(alterar)* | Botão de marcar na forma detalhe |
| `.env.local.example` *(alterar)* | As duas variáveis novas |

---

### Task 1: Projeto Supabase, tabela e variáveis

**Files:**
- Modify: `.env.local`, `.env.local.example`, `package.json`

**Interfaces:**
- Consumes: nada
- Produces: projeto Supabase provisionado, tabela `public.marks` com RLS, `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` em `.env.local`

> **Esta task mexe na conta do usuário e em serviços externos. Peça autorização explícita antes de criar o projeto no Supabase.**

- [ ] **Step 1: Criar o projeto no Supabase**

Pela ferramenta MCP do Supabase, na organização `aulan8nsupabase`:
- nome: `cine-br`
- região: `sa-east-1` (São Paulo — o público é brasileiro e a latência importa)
- plano gratuito

Confirme o custo com `get_cost` e `confirm_cost` antes de criar, como a ferramenta exige. Anote o `project_id` devolvido.

- [ ] **Step 2: Aplicar a migração**

Pela ferramenta `apply_migration`, com o nome `criar_tabela_marks`:

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

alter table public.marks enable row level security;

create policy "le as proprias marcacoes" on public.marks
  for select using (auth.uid() = user_id);

create policy "cria as proprias marcacoes" on public.marks
  for insert with check (auth.uid() = user_id);

create policy "atualiza as proprias marcacoes" on public.marks
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "apaga as proprias marcacoes" on public.marks
  for delete using (auth.uid() = user_id);
```

- [ ] **Step 3: Conferir que a tabela e a RLS existem**

Use `list_tables` e confirme que `marks` aparece com RLS habilitada.

Depois use `get_advisors` com `type: "security"` e confirme que **não** há aviso sobre RLS desabilitada na `marks`. Se houver, a migração não aplicou as políticas — corrija antes de seguir.

- [ ] **Step 4: Configurar o login com Google**

Fora do código, no painel:

1. No Google Cloud Console, criar credenciais OAuth 2.0 do tipo "Aplicativo da Web"
2. Em "URIs de redirecionamento autorizados", colar a URL de callback que o Supabase mostra em Authentication → Providers → Google
3. Colar o Client ID e o Client Secret no Supabase e ativar o provedor
4. No Supabase, em Authentication → URL Configuration, autorizar as URLs de retorno:
   - `http://localhost:3000/auth/callback`
   - `https://cine-br.vercel.app/auth/callback`

- [ ] **Step 5: Preencher as variáveis de ambiente**

Pegue a URL e a chave anônima com `get_project_url` e `get_publishable_keys`.

Acrescente ao final de `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

E ao final de `.env.local.example`, com o comentário explicando por que estas podem ser públicas:

```
# Projeto Supabase — autenticacao e banco das listas.
#
# Estas duas SAO publicas de proposito: o prefixo NEXT_PUBLIC_ manda o Next
# embuti-las no bundle do navegador. Quem protege os dados e a Row Level
# Security do Postgres, nao o segredo da chave.
#
# Isto vale so para elas. O TMDB_ACCESS_TOKEN acima NUNCA leva esse prefixo.
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

- [ ] **Step 6: Instalar as dependências**

```bash
npm install @supabase/ssr @supabase/supabase-js
```

- [ ] **Step 7: Conferir que nada quebrou**

Run: `npm test`
Expected: PASS, os 193 testes que já existiam

Run: `npm run lint`
Expected: sem erros

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json .env.local.example
git commit -m "chore: adiciona supabase e a tabela de marcacoes"
```

---

### Task 2: Cliente do Supabase no servidor

**Files:**
- Create: `lib/supabase/server.ts`
- Test: `lib/supabase/server.test.ts`

**Interfaces:**
- Consumes: `@supabase/ssr` da Task 1
- Produces: `createClient(): Promise<SupabaseClient>`

- [ ] **Step 1: Escrever o teste que falha**

Criar `lib/supabase/server.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const cookieStore = vi.hoisted(() => ({
  getAll: vi.fn(() => [{ name: 'sb-token', value: 'abc' }]),
  set: vi.fn(),
}))
const createServerClient = vi.hoisted(() => vi.fn(() => ({ marcador: true })))

vi.mock('next/headers', () => ({ cookies: async () => cookieStore }))
vi.mock('@supabase/ssr', () => ({ createServerClient }))

import { createClient } from './server'

const URL_ANTERIOR = process.env.NEXT_PUBLIC_SUPABASE_URL
const CHAVE_ANTERIOR = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

describe('createClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://exemplo.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'chave-anonima'
  })

  afterEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = URL_ANTERIOR
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = CHAVE_ANTERIOR
  })

  it('monta o cliente com a url e a chave do ambiente', async () => {
    await createClient()
    const [url, chave] = createServerClient.mock.calls[0]
    expect(url).toBe('https://exemplo.supabase.co')
    expect(chave).toBe('chave-anonima')
  })

  it('entrega os cookies da requisicao ao cliente', async () => {
    await createClient()
    const [, , opcoes] = createServerClient.mock.calls[0]
    expect(opcoes.cookies.getAll()).toEqual([
      { name: 'sb-token', value: 'abc' },
    ])
  })

  it('grava os cookies que o supabase devolve', async () => {
    await createClient()
    const [, , opcoes] = createServerClient.mock.calls[0]
    opcoes.cookies.setAll([
      { name: 'sb-token', value: 'novo', options: { path: '/' } },
    ])
    expect(cookieStore.set).toHaveBeenCalledWith('sb-token', 'novo', {
      path: '/',
    })
  })

  it('engole o erro de gravar cookie em Server Component', async () => {
    cookieStore.set.mockImplementationOnce(() => {
      throw new Error('Cookies can only be modified in a Server Action')
    })
    await createClient()
    const [, , opcoes] = createServerClient.mock.calls[0]
    expect(() =>
      opcoes.cookies.setAll([{ name: 'a', value: 'b', options: {} }]),
    ).not.toThrow()
  })

  it('explica o que fazer quando falta a configuracao', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    await expect(createClient()).rejects.toThrow(/NEXT_PUBLIC_SUPABASE_URL/)
  })
})
```

- [ ] **Step 2: Rodar o teste e conferir que falha**

Run: `npm test -- lib/supabase/server.test.ts`
Expected: FAIL — `Failed to resolve import "./server"`

- [ ] **Step 3: Implementar**

Criar `lib/supabase/server.ts`:

```ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/** Cliente do Supabase para uso no servidor.
 *
 *  A sessão vive em cookie porque Server Components precisam lê-la para
 *  renderizar — não há como guardá-la só na memória do navegador. */
export async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const chave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !chave) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY nao estao configurados. Copie .env.local.example para .env.local e preencha.',
    )
  }

  const cookieStore = await cookies()

  return createServerClient(url, chave, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (paraGravar) => {
        try {
          for (const { name, value, options } of paraGravar) {
            cookieStore.set(name, value, options)
          }
        } catch {
          // Server Component não pode gravar cookie, e o Next lança aqui.
          // A renovação da sessão acontece nos Route Handlers e Server
          // Actions, onde a gravação é permitida — engolir aqui é o
          // comportamento previsto pela biblioteca, não uma falha.
        }
      },
    },
  })
}
```

- [ ] **Step 4: Rodar o teste e conferir que passa**

Run: `npm test -- lib/supabase/server.test.ts`
Expected: PASS, 5 testes

- [ ] **Step 5: Commit**

```bash
git add lib/supabase/server.ts lib/supabase/server.test.ts
git commit -m "feat: adiciona cliente do supabase no servidor"
```

---

### Task 3: Tipos e vocabulário das marcações

**Files:**
- Create: `lib/marks/types.ts`
- Test: `lib/marks/types.test.ts`

**Interfaces:**
- Consumes: nada
- Produces: `MARK_STATES: readonly ['want','watched']`, `MarkState = 'want' | 'watched'`, `MARK_LABEL: Record<MarkState, string>`, `parseMarkState(raw: string | undefined): MarkState | null`, `nextMarkState(current: MarkState | null): MarkState | 'none'`

- [ ] **Step 1: Escrever o teste que falha**

Criar `lib/marks/types.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { MARK_LABEL, nextMarkState, parseMarkState } from './types'

describe('parseMarkState', () => {
  it('aceita os dois estados validos', () => {
    expect(parseMarkState('want')).toBe('want')
    expect(parseMarkState('watched')).toBe('watched')
  })

  it('devolve null para ausencia', () => {
    expect(parseMarkState(undefined)).toBeNull()
    expect(parseMarkState('')).toBeNull()
  })

  it('devolve null para qualquer outra coisa', () => {
    expect(parseMarkState('none')).toBeNull()
    expect(parseMarkState('WANT')).toBeNull()
    expect(parseMarkState('favorito')).toBeNull()
  })
})

describe('MARK_LABEL', () => {
  it('nomeia os estados em portugues', () => {
    expect(MARK_LABEL.want).toBe('Quero assistir')
    expect(MARK_LABEL.watched).toBe('Já assisti')
  })
})

describe('nextMarkState', () => {
  it('sem marca vira quero assistir', () => {
    expect(nextMarkState(null)).toBe('want')
  })

  it('quero assistir vira ja assisti', () => {
    expect(nextMarkState('want')).toBe('watched')
  })

  it('ja assisti volta para sem marca', () => {
    expect(nextMarkState('watched')).toBe('none')
  })

  it('fecha o ciclo em tres cliques', () => {
    const passos = [nextMarkState(null), nextMarkState('want'), nextMarkState('watched')]
    expect(passos).toEqual(['want', 'watched', 'none'])
  })
})
```

- [ ] **Step 2: Rodar o teste e conferir que falha**

Run: `npm test -- lib/marks/types.test.ts`
Expected: FAIL — `Failed to resolve import "./types"`

- [ ] **Step 3: Implementar**

Criar `lib/marks/types.ts`:

```ts
/** Vocabulário das marcações. Puro de propósito: a regra do ciclo do botão
 *  é a mais visível do recurso e precisa ser testável sozinha. */

export const MARK_STATES = ['want', 'watched'] as const
export type MarkState = (typeof MARK_STATES)[number]

export const MARK_LABEL: Record<MarkState, string> = {
  want: 'Quero assistir',
  watched: 'Já assisti',
}

/** Lista fechada: o valor vem de um formulário, que é entrada não confiável.
 *  Mesmo espírito tolerante do parseProviderCookie — lixo vira ausência. */
export function parseMarkState(raw: string | undefined): MarkState | null {
  return (MARK_STATES as readonly string[]).includes(raw ?? '')
    ? (raw as MarkState)
    : null
}

/** O ciclo do botão do cartão: sem marca → quero assistir → já assisti →
 *  sem marca. Três passos num controle só, para o cartão não precisar de
 *  dois botões sobre um pôster de 10rem. */
export function nextMarkState(current: MarkState | null): MarkState | 'none' {
  if (current === null) return 'want'
  return current === 'want' ? 'watched' : 'none'
}
```

- [ ] **Step 4: Rodar o teste e conferir que passa**

Run: `npm test -- lib/marks/types.test.ts`
Expected: PASS, 10 testes

- [ ] **Step 5: Commit**

```bash
git add lib/marks/types.ts lib/marks/types.test.ts
git commit -m "feat: adiciona vocabulario das marcacoes de filme"
```

---

### Task 4: Leitura das marcações

**Files:**
- Create: `lib/marks/queries.ts`
- Test: `lib/marks/queries.test.ts`

**Interfaces:**
- Consumes: `createClient` (Task 2), `MarkState` (Task 3)
- Produces: `MARKS_TABLE = 'marks'`, `CurrentUser { id: string; name: string }`, `getCurrentUser(): Promise<CurrentUser | null>`, `getMarks(): Promise<Map<number, MarkState>>`, `listMarkedIds(state: MarkState): Promise<number[]>`

**Regra de degradação, decidida aqui porque a spec não separa os dois casos:**
`getMarks` é decorativo — alimenta o estado dos botões sobre um catálogo que existe independentemente. Falha vira mapa vazio e a página renderiza. `listMarkedIds` **é** o conteúdo da página de lista; devolver vazio ali mentiria dizendo "você não marcou nada", então ele deixa o erro subir para o `error.tsx` da rota.

- [ ] **Step 1: Escrever o teste que falha**

Criar `lib/marks/queries.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const createClient = vi.hoisted(() => vi.fn())

vi.mock('@/lib/supabase/server', () => ({ createClient }))

import { getCurrentUser, getMarks, listMarkedIds } from './queries'

/** Dublê do encadeamento do supabase-js: from().select().eq().order() */
function supabaseFake({
  user = { id: 'u1', user_metadata: { full_name: 'Ana Souza' } } as unknown,
  rows = [] as unknown[],
  error = null as unknown,
}) {
  const builder: Record<string, unknown> = {}
  builder.select = vi.fn(() => builder)
  builder.eq = vi.fn(() => builder)
  builder.order = vi.fn(() => Promise.resolve({ data: rows, error }))
  builder.then = (resolve: (v: unknown) => unknown) =>
    resolve({ data: rows, error })

  return {
    auth: { getUser: vi.fn(async () => ({ data: { user }, error: null })) },
    from: vi.fn(() => builder),
    builder,
  }
}

describe('getCurrentUser', () => {
  afterEach(() => vi.clearAllMocks())

  it('devolve id e nome de quem esta logado', async () => {
    createClient.mockResolvedValue(supabaseFake({}))
    expect(await getCurrentUser()).toEqual({ id: 'u1', name: 'Ana Souza' })
  })

  it('devolve null sem sessao', async () => {
    createClient.mockResolvedValue(supabaseFake({ user: null }))
    expect(await getCurrentUser()).toBeNull()
  })

  it('cai para o primeiro nome vazio quando o google nao mandou nome', async () => {
    createClient.mockResolvedValue(
      supabaseFake({ user: { id: 'u1', user_metadata: {} } }),
    )
    expect((await getCurrentUser())?.name).toBe('')
  })
})

describe('getMarks', () => {
  afterEach(() => vi.clearAllMocks())

  it('devolve mapa vazio sem sessao, sem consultar a tabela', async () => {
    const fake = supabaseFake({ user: null })
    createClient.mockResolvedValue(fake)

    const marks = await getMarks()

    expect(marks.size).toBe(0)
    expect(fake.from).not.toHaveBeenCalled()
  })

  it('indexa as marcacoes pelo id do filme', async () => {
    createClient.mockResolvedValue(
      supabaseFake({
        rows: [
          { movie_id: 550, state: 'want' },
          { movie_id: 278, state: 'watched' },
        ],
      }),
    )

    const marks = await getMarks()

    expect(marks.get(550)).toBe('want')
    expect(marks.get(278)).toBe('watched')
  })

  it('degrada para mapa vazio quando a consulta falha', async () => {
    createClient.mockResolvedValue(
      supabaseFake({ rows: null, error: { message: 'fora do ar' } }),
    )
    expect((await getMarks()).size).toBe(0)
  })

  it('degrada para mapa vazio quando o cliente nem monta', async () => {
    createClient.mockRejectedValue(new Error('sem configuracao'))
    expect((await getMarks()).size).toBe(0)
  })
})

describe('listMarkedIds', () => {
  beforeEach(() => vi.clearAllMocks())

  it('devolve os ids do estado pedido', async () => {
    createClient.mockResolvedValue(
      supabaseFake({ rows: [{ movie_id: 550 }, { movie_id: 278 }] }),
    )
    expect(await listMarkedIds('want')).toEqual([550, 278])
  })

  it('filtra pelo estado e ordena por mais recente', async () => {
    const fake = supabaseFake({ rows: [] })
    createClient.mockResolvedValue(fake)

    await listMarkedIds('watched')

    expect(fake.builder.eq).toHaveBeenCalledWith('state', 'watched')
    expect(fake.builder.order).toHaveBeenCalledWith('updated_at', {
      ascending: false,
    })
  })

  it('devolve lista vazia sem sessao', async () => {
    createClient.mockResolvedValue(supabaseFake({ user: null }))
    expect(await listMarkedIds('want')).toEqual([])
  })

  it('deixa o erro subir: e o conteudo da pagina, nao enfeite', async () => {
    createClient.mockResolvedValue(
      supabaseFake({ rows: null, error: { message: 'fora do ar' } }),
    )
    await expect(listMarkedIds('want')).rejects.toThrow(/fora do ar/)
  })
})
```

- [ ] **Step 2: Rodar o teste e conferir que falha**

Run: `npm test -- lib/marks/queries.test.ts`
Expected: FAIL — `Failed to resolve import "./queries"`

- [ ] **Step 3: Implementar**

Criar `lib/marks/queries.ts`:

```ts
import { createClient } from '@/lib/supabase/server'
import type { MarkState } from './types'

export const MARKS_TABLE = 'marks'

export interface CurrentUser {
  id: string
  name: string
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return null

    const metadata = user.user_metadata as { full_name?: string } | null
    return { id: user.id, name: metadata?.full_name ?? '' }
  } catch {
    return null
  }
}

/**
 * Todas as marcações da pessoa, indexadas pelo id do filme.
 *
 * Traz o conjunto inteiro, e não só os filmes da tela: são dezenas ou
 * centenas de linhas por pessoa, e filtrar por uma lista de ids sairia mais
 * caro em complexidade do que economizaria em tráfego.
 *
 * Falha vira mapa vazio. Estas marcações são decorativas — pintam botões
 * sobre um catálogo que existe sem elas — e derrubar a home porque o banco
 * piscou seria desproporcional.
 */
export async function getMarks(): Promise<Map<number, MarkState>> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return new Map()

    const { data, error } = await supabase
      .from(MARKS_TABLE)
      .select('movie_id, state')

    if (error || !data) return new Map()

    return new Map(
      data.map((linha) => [
        linha.movie_id as number,
        linha.state as MarkState,
      ]),
    )
  } catch {
    return new Map()
  }
}

/**
 * Os ids de um estado, mais recentes primeiro.
 *
 * Ao contrário de getMarks, este **deixa o erro subir**: ele é o conteúdo da
 * página de lista, e devolver vazio diria "você não marcou nada" quando a
 * verdade é "não consegui perguntar".
 */
export async function listMarkedIds(state: MarkState): Promise<number[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from(MARKS_TABLE)
    .select('movie_id')
    .eq('state', state)
    .order('updated_at', { ascending: false })

  if (error) throw new Error(error.message)

  return (data ?? []).map((linha) => linha.movie_id as number)
}
```

- [ ] **Step 4: Rodar o teste e conferir que passa**

Run: `npm test -- lib/marks/queries.test.ts`
Expected: PASS, 11 testes

- [ ] **Step 5: Commit**

```bash
git add lib/marks/queries.ts lib/marks/queries.test.ts
git commit -m "feat: adiciona leitura das marcacoes do usuario"
```

---

### Task 5: Server Actions de marcar e sair

**Files:**
- Modify: `app/actions.ts`
- Test: `app/actions.test.ts`

**Interfaces:**
- Consumes: `createClient` (Task 2), `parseMarkState` (Task 3), `MARKS_TABLE` (Task 4)
- Produces: `setMark(formData: FormData): Promise<void>`, `signOut(): Promise<void>`

Campos esperados no `FormData` do `setMark`: `movieId` (número) e `state` (`'want'`, `'watched'` ou `'none'`).

- [ ] **Step 1: Escrever os testes que falham**

Substituir o topo de `app/actions.test.ts` (os `vi.mock` e os imports) por:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

const cookieStore = vi.hoisted(() => ({ set: vi.fn(), get: vi.fn() }))
const revalidatePath = vi.hoisted(() => vi.fn())
const redirect = vi.hoisted(() =>
  vi.fn((destino: string) => {
    throw new Error(`REDIRECT:${destino}`)
  }),
)
const createClient = vi.hoisted(() => vi.fn())

vi.mock('next/headers', () => ({ cookies: async () => cookieStore }))
vi.mock('next/cache', () => ({ revalidatePath }))
vi.mock('next/navigation', () => ({ redirect }))
vi.mock('@/lib/supabase/server', () => ({ createClient }))

import { saveProviders, setMark, signOut } from './actions'
```

E acrescentar ao final do arquivo:

```ts
/** Dublê do encadeamento de escrita: from().upsert() e from().delete().eq() */
function supabaseFake(user: unknown = { id: 'u1' }) {
  const upsert = vi.fn(async () => ({ error: null }))
  const eq = vi.fn(() => builderDelete)
  const builderDelete: Record<string, unknown> = { eq }
  const del = vi.fn(() => builderDelete)

  return {
    auth: {
      getUser: vi.fn(async () => ({ data: { user }, error: null })),
      signOut: vi.fn(async () => ({ error: null })),
    },
    from: vi.fn(() => ({ upsert, delete: del })),
    upsert,
    del,
    eq,
  }
}

function formulario(movieId: string, state: string): FormData {
  const form = new FormData()
  form.append('movieId', movieId)
  form.append('state', state)
  return form
}

describe('setMark', () => {
  beforeEach(() => vi.clearAllMocks())

  it('grava a marcacao de quem esta logado', async () => {
    const fake = supabaseFake()
    createClient.mockResolvedValue(fake)

    await setMark(formulario('550', 'want'))

    expect(fake.from).toHaveBeenCalledWith('marks')
    expect(fake.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'u1', movie_id: 550, state: 'want' }),
    )
  })

  it('troca quero assistir por ja assisti sem criar segunda linha', async () => {
    const fake = supabaseFake()
    createClient.mockResolvedValue(fake)

    await setMark(formulario('550', 'watched'))

    expect(fake.upsert).toHaveBeenCalledTimes(1)
    expect(fake.del).not.toHaveBeenCalled()
  })

  it('apaga a linha quando o estado e none', async () => {
    const fake = supabaseFake()
    createClient.mockResolvedValue(fake)

    await setMark(formulario('550', 'none'))

    expect(fake.del).toHaveBeenCalled()
    expect(fake.upsert).not.toHaveBeenCalled()
  })

  it('manda para o login quem nao tem sessao', async () => {
    createClient.mockResolvedValue(supabaseFake(null))

    await expect(setMark(formulario('550', 'want'))).rejects.toThrow(
      'REDIRECT:/auth/login',
    )
  })

  it('recusa movieId que nao e numero, sem tocar no banco', async () => {
    const fake = supabaseFake()
    createClient.mockResolvedValue(fake)

    await setMark(formulario('abc', 'want'))

    expect(fake.upsert).not.toHaveBeenCalled()
    expect(fake.del).not.toHaveBeenCalled()
  })

  it('recusa estado desconhecido', async () => {
    const fake = supabaseFake()
    createClient.mockResolvedValue(fake)

    await setMark(formulario('550', 'favorito'))

    expect(fake.upsert).not.toHaveBeenCalled()
  })

  it('deixa o erro de gravacao subir', async () => {
    const fake = supabaseFake()
    fake.upsert.mockResolvedValue({ error: { message: 'sem permissao' } })
    createClient.mockResolvedValue(fake)

    await expect(setMark(formulario('550', 'want'))).rejects.toThrow(
      /sem permissao/,
    )
  })
})

describe('signOut', () => {
  beforeEach(() => vi.clearAllMocks())

  it('encerra a sessao e volta para a home', async () => {
    const fake = supabaseFake()
    createClient.mockResolvedValue(fake)

    await expect(signOut()).rejects.toThrow('REDIRECT:/')
    expect(fake.auth.signOut).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Rodar os testes e conferir que falham**

Run: `npm test -- app/actions.test.ts`
Expected: FAIL — `setMark is not a function`, e os quatro testes do `saveProviders` continuam passando

- [ ] **Step 3: Implementar**

Em `app/actions.ts`, acrescentar aos imports:

```ts
import { redirect } from 'next/navigation'
import { MARKS_TABLE } from '@/lib/marks/queries'
import { parseMarkState } from '@/lib/marks/types'
import { createClient } from '@/lib/supabase/server'
```

E acrescentar ao final do arquivo:

```ts
/**
 * Marca um filme como "quero assistir" ou "já assisti", ou tira a marca.
 *
 * Não chama revalidatePath de propósito: todas as rotas do app são dinâmicas
 * e getMarks consulta o banco a cada renderização, então a marcação nova
 * aparece sozinha. Chamar revalidatePath aqui purgaria também o cache de uma
 * hora das consultas ao TMDB daquela rota — caro, e sem ganho.
 */
export async function setMark(formData: FormData): Promise<void> {
  const movieId = Number.parseInt(String(formData.get('movieId') ?? ''), 10)
  if (!Number.isInteger(movieId) || movieId <= 0) return

  const bruto = String(formData.get('state') ?? '')
  const state = parseMarkState(bruto)
  // 'none' é o único valor aceito fora dos dois estados: significa desmarcar.
  if (state === null && bruto !== 'none') return

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Sem sessão, convida a entrar em vez de falhar em silêncio.
  if (!user) redirect('/auth/login')

  const { error } =
    state === null
      ? await supabase
          .from(MARKS_TABLE)
          .delete()
          .eq('user_id', user.id)
          .eq('movie_id', movieId)
      : await supabase.from(MARKS_TABLE).upsert({
          user_id: user.id,
          movie_id: movieId,
          state,
          updated_at: new Date().toISOString(),
        })

  // Gravação que falha em silêncio é pior que erro visível: a pessoa acha
  // que marcou e descobre depois que não marcou.
  if (error) throw new Error(error.message)
}

export async function signOut(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/')
}
```

- [ ] **Step 4: Rodar os testes e conferir que passam**

Run: `npm test -- app/actions.test.ts`
Expected: PASS, os 4 testes antigos mais os 8 novos

- [ ] **Step 5: Commit**

```bash
git add app/actions.ts app/actions.test.ts
git commit -m "feat: adiciona server actions de marcar filme e sair"
```

---

### Task 6: Rotas de entrada e retorno do Google

**Files:**
- Create: `app/auth/login/route.ts`, `app/auth/callback/route.ts`

**Interfaces:**
- Consumes: `createClient` (Task 2)
- Produces: as rotas `GET /auth/login` e `GET /auth/callback`

Sem teste unitário: são duas funções de cinco linhas cujo comportamento inteiro é a integração com o Supabase e com o Google. Dublar isso testaria o dublê. A verificação real está na Task 12, no navegador.

- [ ] **Step 1: Criar a rota de entrada**

Criar `app/auth/login/route.ts`:

```ts
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/** Monta a URL do Google no servidor e manda a pessoa para lá.
 *
 *  Feito assim, e não com um cliente de navegador, para o login não exigir
 *  JavaScript — a mesma razão pela qual a barra de filtros é um GET puro. */
export async function GET(request: Request): Promise<never> {
  const origem = new URL(request.url).origin
  const supabase = await createClient()

  const { data } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${origem}/auth/callback` },
  })

  redirect(data?.url ?? '/')
}
```

- [ ] **Step 2: Criar a rota de retorno**

Criar `app/auth/callback/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/** O Google devolve um código de uso único; aqui ele vira sessão em cookie.
 *  Precisa ser Route Handler, e não Server Component, porque só aqui o Next
 *  permite gravar cookie. */
export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      return NextResponse.redirect(`${url.origin}/?erro=login`)
    }
  }

  return NextResponse.redirect(url.origin)
}
```

- [ ] **Step 3: Conferir que compila e o lint passa**

Run: `npx tsc --noEmit`
Expected: sem erros

Run: `npm run lint`
Expected: sem erros

- [ ] **Step 4: Commit**

```bash
git add app/auth
git commit -m "feat: adiciona rotas de entrada e retorno do login google"
```

---

### Task 7: Botão de entrar e sair no cabeçalho

**Files:**
- Create: `components/layout/AuthButton.tsx`
- Modify: `components/layout/Header.tsx`
- Test: `components/layout/AuthButton.test.tsx`

**Interfaces:**
- Consumes: `CurrentUser` (Task 4), `signOut` (Task 5)
- Produces: `<AuthButton user={user} />`, onde `user: CurrentUser | null`

- [ ] **Step 1: Escrever o teste que falha**

Criar `components/layout/AuthButton.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/app/actions', () => ({ signOut: vi.fn() }))

import { AuthButton } from './AuthButton'

describe('AuthButton', () => {
  it('convida a entrar quem nao tem sessao', () => {
    render(<AuthButton user={null} />)
    const link = screen.getByRole('link', { name: /entrar/i })
    expect(link.getAttribute('href')).toBe('/auth/login')
  })

  it('mostra o primeiro nome de quem esta logado', () => {
    render(<AuthButton user={{ id: 'u1', name: 'Ana Souza' }} />)
    expect(screen.getByText('Ana')).toBeDefined()
  })

  it('oferece sair para quem esta logado', () => {
    render(<AuthButton user={{ id: 'u1', name: 'Ana Souza' }} />)
    expect(screen.getByRole('button', { name: /sair/i })).toBeDefined()
  })

  it('nao oferece entrar para quem ja entrou', () => {
    render(<AuthButton user={{ id: 'u1', name: 'Ana Souza' }} />)
    expect(screen.queryByRole('link', { name: /entrar/i })).toBeNull()
  })

  it('aguenta usuario sem nome vindo do google', () => {
    render(<AuthButton user={{ id: 'u1', name: '' }} />)
    expect(screen.getByRole('button', { name: /sair/i })).toBeDefined()
  })
})
```

- [ ] **Step 2: Rodar o teste e conferir que falha**

Run: `npm test -- components/layout/AuthButton.test.tsx`
Expected: FAIL — `Failed to resolve import "./AuthButton"`

- [ ] **Step 3: Implementar o botão**

Criar `components/layout/AuthButton.tsx`:

```tsx
import Link from 'next/link'
import { signOut } from '@/app/actions'
import type { CurrentUser } from '@/lib/marks/queries'

const BOTAO =
  'shrink-0 rounded-sm border border-projecao/20 bg-tinta/40 px-3 py-2 text-sm text-projecao backdrop-blur-md transition-colors hover:border-luz/60 hover:text-luz'

export function AuthButton({ user }: { user: CurrentUser | null }) {
  if (!user) {
    return (
      <Link href="/auth/login" className={BOTAO}>
        Entrar
      </Link>
    )
  }

  // Só o primeiro nome: o cabeçalho é estreito no celular e "Ana" identifica
  // tão bem quanto "Ana Souza" para quem já sabe que é a própria conta.
  const primeiroNome = user.name.split(' ')[0]

  return (
    <div className="flex shrink-0 items-center gap-2">
      {primeiroNome !== '' && (
        <span className="hidden text-sm text-nevoa sm:inline">
          {primeiroNome}
        </span>
      )}
      <form action={signOut}>
        <button type="submit" className={BOTAO}>
          Sair
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 4: Rodar o teste e conferir que passa**

Run: `npm test -- components/layout/AuthButton.test.tsx`
Expected: PASS, 5 testes

- [ ] **Step 5: Ligar no cabeçalho**

Em `components/layout/Header.tsx`, acrescentar ao topo:

```tsx
import type { CurrentUser } from '@/lib/marks/queries'
import { AuthButton } from './AuthButton'
```

Trocar a interface e a assinatura por:

```tsx
interface HeaderProps {
  selectedCount: number
  user: CurrentUser | null
}

export function Header({ selectedCount, user }: HeaderProps) {
```

E, logo depois do `<Link href="/?providers=open">` que fecha o cabeçalho, acrescentar:

```tsx
        <AuthButton user={user} />
```

- [ ] **Step 6: Alimentar o cabeçalho no layout**

Em `app/layout.tsx`, acrescentar ao topo:

```tsx
import { getCurrentUser } from '@/lib/marks/queries'
```

Trocar a linha que lê os provedores por:

```tsx
  const [selected, user] = await Promise.all([
    readSelectedProviderIds(),
    getCurrentUser(),
  ])
```

E passar o usuário adiante:

```tsx
        <Header selectedCount={selected.length} user={user} />
```

- [ ] **Step 7: Rodar a suite inteira**

Run: `npm test`
Expected: PASS

Run: `npx tsc --noEmit`
Expected: sem erros

- [ ] **Step 8: Commit**

```bash
git add components/layout/AuthButton.tsx components/layout/AuthButton.test.tsx components/layout/Header.tsx app/layout.tsx
git commit -m "feat: adiciona botao de entrar e sair no cabecalho"
```

---

### Task 8: Reestruturar o cartão de filme

**Files:**
- Modify: `components/catalog/MovieCard.tsx`
- Test: `components/catalog/MovieCard.test.tsx`

**Interfaces:**
- Consumes: nada de tasks anteriores
- Produces: `MovieCard` com raiz `<div>` e um ponto de encaixe `action` para o botão

Esta task **não** adiciona o botão — só prepara o cartão para recebê-lo, e prova que o encaixe fica fora do link.

- [ ] **Step 1: Escrever o teste que falha**

Criar `components/catalog/MovieCard.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Movie } from '@/lib/catalog/types'
import { MovieCard } from './MovieCard'

const FILME: Movie = {
  id: 550,
  title: 'Clube da Luta',
  year: 1999,
  overview: '',
  posterUrl: 'https://image.tmdb.org/t/p/w500/p.jpg',
  backdropUrl: null,
  rating: 8.4,
  runtimeMinutes: null,
}

describe('MovieCard', () => {
  it('leva para a pagina do filme', () => {
    render(<MovieCard movie={FILME} />)
    expect(screen.getByRole('link').getAttribute('href')).toBe('/movie/550')
  })

  it('mostra titulo e ano', () => {
    render(<MovieCard movie={FILME} />)
    expect(screen.getByText('Clube da Luta')).toBeDefined()
    expect(screen.getByText('1999')).toBeDefined()
  })

  it('renderiza a acao recebida', () => {
    render(<MovieCard movie={FILME} action={<button>Marcar</button>} />)
    expect(screen.getByRole('button', { name: 'Marcar' })).toBeDefined()
  })

  it('mantem a acao FORA do link', () => {
    // Um form ou button dentro de um <a> e HTML invalido: o navegador
    // desmonta a arvore e o clique em "marcar" navega para o filme junto.
    render(<MovieCard movie={FILME} action={<button>Marcar</button>} />)
    const link = screen.getByRole('link')
    const botao = screen.getByRole('button', { name: 'Marcar' })
    expect(link.contains(botao)).toBe(false)
  })

  it('nao renderiza nada de acao quando nenhuma foi passada', () => {
    render(<MovieCard movie={FILME} />)
    expect(screen.queryByRole('button')).toBeNull()
  })
})
```

- [ ] **Step 2: Rodar o teste e conferir que falha**

Run: `npm test -- components/catalog/MovieCard.test.tsx`
Expected: FAIL — os dois testes de `action` reprovam; o de "FORA do link" é o que importa

- [ ] **Step 3: Implementar**

Em `components/catalog/MovieCard.tsx`, acrescentar à interface de props:

```tsx
  /** Encaixe para o botão de marcar. Fica FORA do link de propósito: um
   *  form ou button dentro de um <a> é HTML inválido, quebra a navegação
   *  por teclado e faz o clique navegar para o filme junto. */
  action?: React.ReactNode
```

Acrescentar `action` à desestruturação dos parâmetros.

Trocar a raiz: o `<Link href={...} className="group relative block">` que abre o componente passa a ser

```tsx
    <div className="group relative">
      <Link href={`/movie/${movie.id}`} className="block">
```

e o `</Link>` do final passa a ser

```tsx
      </Link>
      {action && <div className="absolute right-1.5 top-1.5 z-20">{action}</div>}
    </div>
```

O `group` sobe para o `div` para que o efeito de aproximação do pôster continue reagindo ao mouse sobre o cartão inteiro, botão incluído.

- [ ] **Step 4: Rodar os testes e conferir que passam**

Run: `npm test -- components/catalog/MovieCard.test.tsx`
Expected: PASS, 5 testes

Run: `npm test`
Expected: PASS — a suíte inteira, para provar que nenhuma tela quebrou com a mudança de estrutura

- [ ] **Step 5: Commit**

```bash
git add components/catalog/MovieCard.tsx components/catalog/MovieCard.test.tsx
git commit -m "refactor: tira a raiz do cartao de dentro do link"
```

---

### Task 9: Botão de marcar

**Files:**
- Create: `components/catalog/MarkButton.tsx`
- Test: `components/catalog/MarkButton.test.tsx`

**Interfaces:**
- Consumes: `MarkState`, `MARK_LABEL`, `nextMarkState` (Task 3), `setMark` (Task 5)
- Produces: `<MarkButton movieId={n} current={s} signedIn={b} variant="card" | "detail" />`

- [ ] **Step 1: Escrever o teste que falha**

Criar `components/catalog/MarkButton.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/app/actions', () => ({ setMark: vi.fn() }))

import { MarkButton } from './MarkButton'

function campoOculto(nome: string): HTMLInputElement | null {
  return document.querySelector(`input[name="${nome}"]`)
}

describe('MarkButton na forma cartao', () => {
  it('sem marca, o clique pede quero assistir', () => {
    render(<MarkButton movieId={550} current={null} signedIn />)
    expect(campoOculto('state')?.value).toBe('want')
    expect(campoOculto('movieId')?.value).toBe('550')
  })

  it('em quero assistir, o clique passa para ja assisti', () => {
    render(<MarkButton movieId={550} current="want" signedIn />)
    expect(campoOculto('state')?.value).toBe('watched')
  })

  it('em ja assisti, o clique desmarca', () => {
    render(<MarkButton movieId={550} current="watched" signedIn />)
    expect(campoOculto('state')?.value).toBe('none')
  })

  it('anuncia o estado atual para leitores de tela', () => {
    render(<MarkButton movieId={550} current="want" signedIn />)
    expect(screen.getByRole('button').getAttribute('aria-pressed')).toBe('true')
  })

  it('quem nao entrou recebe um link para o login, nao um formulario', () => {
    render(<MarkButton movieId={550} current={null} signedIn={false} />)
    expect(screen.getByRole('link').getAttribute('href')).toBe('/auth/login')
    expect(screen.queryByRole('button')).toBeNull()
  })
})

describe('MarkButton na forma detalhe', () => {
  it('mostra os dois estados como botoes separados', () => {
    render(
      <MarkButton movieId={550} current={null} signedIn variant="detail" />,
    )
    expect(screen.getByRole('button', { name: /quero assistir/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /já assisti/i })).toBeDefined()
  })

  it('clicar no estado ja ativo desmarca', () => {
    render(
      <MarkButton movieId={550} current="want" signedIn variant="detail" />,
    )
    const estados = Array.from(
      document.querySelectorAll('input[name="state"]'),
    ).map((campo) => (campo as HTMLInputElement).value)
    expect(estados).toEqual(['none', 'watched'])
  })

  it('quem nao entrou recebe links para o login', () => {
    render(
      <MarkButton
        movieId={550}
        current={null}
        signedIn={false}
        variant="detail"
      />,
    )
    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(2)
    expect(links[0].getAttribute('href')).toBe('/auth/login')
  })
})
```

- [ ] **Step 2: Rodar o teste e conferir que falha**

Run: `npm test -- components/catalog/MarkButton.test.tsx`
Expected: FAIL — `Failed to resolve import "./MarkButton"`

- [ ] **Step 3: Implementar**

Criar `components/catalog/MarkButton.tsx`:

```tsx
import Link from 'next/link'
import { setMark } from '@/app/actions'
import { MARK_LABEL, nextMarkState, type MarkState } from '@/lib/marks/types'

interface MarkButtonProps {
  movieId: number
  current: MarkState | null
  signedIn: boolean
  /** 'card' é um controle só, que cicla. 'detail' são dois botões, porque
   *  ali há espaço e o estado precisa ficar legível sem inferência. */
  variant?: 'card' | 'detail'
}

const BASE =
  'rounded-sm border px-2 py-1 text-xs transition-colors backdrop-blur-md'

const ACESO = 'border-luz/70 bg-tinta/70 text-luz'
const APAGADO = 'border-projecao/25 bg-tinta/60 text-projecao/80 hover:border-luz/50'

/** Um formulário por botão: sem JavaScript, como o resto do site. */
function Form({
  movieId,
  state,
  children,
  className,
  pressed,
  label,
}: {
  movieId: number
  state: MarkState | 'none'
  children: React.ReactNode
  className: string
  pressed: boolean
  label: string
}) {
  return (
    <form action={setMark}>
      <input type="hidden" name="movieId" value={movieId} />
      <input type="hidden" name="state" value={state} />
      <button
        type="submit"
        className={className}
        aria-pressed={pressed}
        aria-label={label}
      >
        {children}
      </button>
    </form>
  )
}

export function MarkButton({
  movieId,
  current,
  signedIn,
  variant = 'card',
}: MarkButtonProps) {
  // Quem não entrou vê o mesmo controle, mas ele leva ao login. Esconder o
  // botão esconderia justamente a razão de criar uma conta.
  const convite = (texto: string, className: string) => (
    <Link href="/auth/login" className={className} aria-label={`${texto} — entre para marcar`}>
      {texto}
    </Link>
  )

  if (variant === 'detail') {
    const botao = (state: MarkState) => {
      const ativo = current === state
      const className = `${BASE} ${ativo ? ACESO : APAGADO}`
      if (!signedIn) return convite(MARK_LABEL[state], className)
      return (
        <Form
          movieId={movieId}
          // Clicar no estado já ativo desmarca.
          state={ativo ? 'none' : state}
          className={className}
          pressed={ativo}
          label={MARK_LABEL[state]}
        >
          {MARK_LABEL[state]}
        </Form>
      )
    }

    return (
      <div className="flex flex-wrap gap-2">
        {botao('want')}
        {botao('watched')}
      </div>
    )
  }

  const texto = current === null ? MARK_LABEL.want : MARK_LABEL[current]
  const className = `${BASE} ${current === null ? APAGADO : ACESO}`

  if (!signedIn) return convite(texto, className)

  return (
    <Form
      movieId={movieId}
      state={nextMarkState(current)}
      className={className}
      pressed={current !== null}
      label={texto}
    >
      {texto}
    </Form>
  )
}
```

- [ ] **Step 4: Rodar o teste e conferir que passa**

Run: `npm test -- components/catalog/MarkButton.test.tsx`
Expected: PASS, 8 testes

- [ ] **Step 5: Commit**

```bash
git add components/catalog/MarkButton.tsx components/catalog/MarkButton.test.tsx
git commit -m "feat: adiciona botao de marcar filme"
```

---

### Task 10: Abas de navegação

**Files:**
- Create: `components/layout/ListTabs.tsx`
- Test: `components/layout/ListTabs.test.tsx`

**Interfaces:**
- Consumes: nada de tasks anteriores
- Produces: `<ListTabs active="discover" | "want" | "watched" />`

- [ ] **Step 1: Escrever o teste que falha**

Criar `components/layout/ListTabs.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ListTabs } from './ListTabs'

describe('ListTabs', () => {
  it('mostra as tres abas', () => {
    render(<ListTabs active="discover" />)
    expect(screen.getByRole('link', { name: 'Descobrir' })).toBeDefined()
    expect(screen.getByRole('link', { name: 'Quero assistir' })).toBeDefined()
    expect(screen.getByRole('link', { name: 'Já assisti' })).toBeDefined()
  })

  it('aponta cada aba para a rota certa', () => {
    render(<ListTabs active="discover" />)
    expect(
      screen.getByRole('link', { name: 'Descobrir' }).getAttribute('href'),
    ).toBe('/')
    expect(
      screen.getByRole('link', { name: 'Quero assistir' }).getAttribute('href'),
    ).toBe('/quero-assistir')
    expect(
      screen.getByRole('link', { name: 'Já assisti' }).getAttribute('href'),
    ).toBe('/assisti')
  })

  it('marca a aba ativa para leitores de tela', () => {
    render(<ListTabs active="want" />)
    expect(
      screen
        .getByRole('link', { name: 'Quero assistir' })
        .getAttribute('aria-current'),
    ).toBe('page')
  })

  it('marca apenas uma aba como ativa', () => {
    render(<ListTabs active="watched" />)
    const marcadas = screen
      .getAllByRole('link')
      .filter((link) => link.getAttribute('aria-current') === 'page')
    expect(marcadas).toHaveLength(1)
  })

  it('e uma navegacao nomeada', () => {
    render(<ListTabs active="discover" />)
    expect(screen.getByRole('navigation', { name: /listas/i })).toBeDefined()
  })
})
```

- [ ] **Step 2: Rodar o teste e conferir que falha**

Run: `npm test -- components/layout/ListTabs.test.tsx`
Expected: FAIL — `Failed to resolve import "./ListTabs"`

- [ ] **Step 3: Implementar**

Criar `components/layout/ListTabs.tsx`:

```tsx
import Link from 'next/link'

export type TabKey = 'discover' | 'want' | 'watched'

const ABAS: { key: TabKey; href: string; label: string }[] = [
  { key: 'discover', href: '/', label: 'Descobrir' },
  { key: 'want', href: '/quero-assistir', label: 'Quero assistir' },
  { key: 'watched', href: '/assisti', label: 'Já assisti' },
]

/** As abas aparecem para quem não tem conta também. Escondê-las esconderia
 *  a razão de criar uma. */
export function ListTabs({ active }: { active: TabKey }) {
  return (
    <nav aria-label="Suas listas" className="flex gap-1 border-b border-borda">
      {ABAS.map((aba) => {
        const ativa = aba.key === active
        return (
          <Link
            key={aba.key}
            href={aba.href}
            aria-current={ativa ? 'page' : undefined}
            className={`-mb-px border-b-2 px-3 py-2 text-sm transition-colors ${
              ativa
                ? 'border-luz text-projecao'
                : 'border-transparent text-nevoa hover:text-projecao'
            }`}
          >
            {aba.label}
          </Link>
        )
      })}
    </nav>
  )
}
```

- [ ] **Step 4: Rodar o teste e conferir que passa**

Run: `npm test -- components/layout/ListTabs.test.tsx`
Expected: PASS, 5 testes

- [ ] **Step 5: Commit**

```bash
git add components/layout/ListTabs.tsx components/layout/ListTabs.test.tsx
git commit -m "feat: adiciona abas de navegacao das listas"
```

---

### Task 11: A grade e a lista marcada

**Files:**
- Modify: `components/catalog/MovieGrid.tsx`
- Create: `components/catalog/MarkedList.tsx`
- Test: `components/catalog/MovieGrid.test.tsx`

**Interfaces:**
- Consumes: `AvailabilityLabel`, `MarkState`, `MarkButton` (Task 9), `listMarkedIds`/`getCurrentUser` (Task 4)
- Produces: `<MovieGrid movies availability? marks? signedIn? />`, `<MarkedList state={s} />`

- [ ] **Step 1: Escrever o teste que falha**

Criar `components/catalog/MovieGrid.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/app/actions', () => ({ setMark: vi.fn() }))

import type { Movie } from '@/lib/catalog/types'
import { MovieGrid } from './MovieGrid'

function filme(id: number): Movie {
  return {
    id,
    title: `Filme ${id}`,
    year: 1999,
    overview: '',
    posterUrl: '/p.jpg',
    backdropUrl: null,
    rating: 8,
    runtimeMinutes: null,
  }
}

describe('MovieGrid', () => {
  it('mostra o estado vazio quando nao ha filmes', () => {
    render(<MovieGrid movies={[]} />)
    expect(screen.queryByRole('link', { name: /Filme/ })).toBeNull()
  })

  it('renderiza um cartao por filme', () => {
    render(<MovieGrid movies={[filme(1), filme(2)]} />)
    expect(screen.getByText('Filme 1')).toBeDefined()
    expect(screen.getByText('Filme 2')).toBeDefined()
  })

  it('nao mostra botao de marcar sem o mapa de marcacoes', () => {
    render(<MovieGrid movies={[filme(1)]} />)
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('mostra o botao de marcar quando recebe o mapa', () => {
    render(
      <MovieGrid movies={[filme(1)]} marks={new Map()} signedIn />,
    )
    expect(screen.getByRole('button', { name: /quero assistir/i })).toBeDefined()
  })

  it('reflete a marcacao existente de cada filme', () => {
    render(
      <MovieGrid
        movies={[filme(1)]}
        marks={new Map([[1, 'watched' as const]])}
        signedIn
      />,
    )
    expect(screen.getByRole('button', { name: /já assisti/i })).toBeDefined()
  })

  it('passa o selo de disponibilidade adiante', () => {
    render(
      <MovieGrid
        movies={[filme(1)]}
        availability={new Map([[1, 'subscription' as const]])}
      />,
    )
    expect(screen.getByText('Na sua assinatura')).toBeDefined()
  })
})
```

- [ ] **Step 2: Rodar o teste e conferir que falha**

Run: `npm test -- components/catalog/MovieGrid.test.tsx`
Expected: FAIL — os três últimos testes reprovam; `MovieGrid` ainda não aceita essas props

- [ ] **Step 3: Ampliar a grade**

Substituir `components/catalog/MovieGrid.tsx` inteiro por:

```tsx
import type { AvailabilityLabel } from '@/lib/catalog/search-availability'
import type { Movie } from '@/lib/catalog/types'
import type { MarkState } from '@/lib/marks/types'
import { EmptyState } from './EmptyState'
import { MarkButton } from './MarkButton'
import { MovieCard } from './MovieCard'

interface MovieGridProps {
  movies: Movie[]
  /** Selo por filme. Sem isto, os cartões saem sem régua de disponibilidade,
   *  como na home. */
  availability?: ReadonlyMap<number, AvailabilityLabel>
  /** Marcações da pessoa. A presença deste mapa é o que liga o botão de
   *  marcar — a home passa, a busca não. */
  marks?: ReadonlyMap<number, MarkState>
  signedIn?: boolean
}

export function MovieGrid({
  movies,
  availability,
  marks,
  signedIn = false,
}: MovieGridProps) {
  if (movies.length === 0) return <EmptyState />

  return (
    <div className="grid grid-cols-3 gap-x-3 gap-y-8 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8">
      {movies.map((movie) => (
        <MovieCard
          key={movie.id}
          movie={movie}
          availability={availability?.get(movie.id)}
          action={
            marks ? (
              <MarkButton
                movieId={movie.id}
                current={marks.get(movie.id) ?? null}
                signedIn={signedIn}
              />
            ) : undefined
          }
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Rodar o teste e conferir que passa**

Run: `npm test -- components/catalog/MovieGrid.test.tsx`
Expected: PASS, 6 testes

- [ ] **Step 5: Criar a lista marcada**

Criar `components/catalog/MarkedList.tsx`:

```tsx
import { mapWithConcurrency } from '@/lib/concurrency'
import { getMovieDetail } from '@/lib/catalog/queries'
import { classifyAvailability } from '@/lib/catalog/search-availability'
import type { AvailabilityLabel } from '@/lib/catalog/search-availability'
import type { Movie } from '@/lib/catalog/types'
import { getCurrentUser, listMarkedIds } from '@/lib/marks/queries'
import { MARK_LABEL, type MarkState } from '@/lib/marks/types'
import { readSelectedProviderIds } from '@/lib/preferences.server'
import { EmptyState } from './EmptyState'
import { MovieGrid } from './MovieGrid'

/** Teto de detalhes buscados ao mesmo tempo. Mesmo número usado para
 *  resolver o imdb_id: protege do 429 do TMDB sem serializar. */
const CONCORRENCIA = 8

export async function MarkedList({ state }: { state: MarkState }) {
  const user = await getCurrentUser()

  if (!user) {
    return (
      <EmptyState
        title="Entre para montar suas listas."
        hint={`Com uma conta, você marca o que quer ver e o que já viu. A lista "${MARK_LABEL[state]}" fica guardada e te espera em qualquer aparelho.`}
        actionLabel="Voltar ao catálogo"
      />
    )
  }

  const [ids, selectedIds] = await Promise.all([
    listMarkedIds(state),
    readSelectedProviderIds(),
  ])

  if (ids.length === 0) {
    return (
      <EmptyState
        title={`Nada em "${MARK_LABEL[state]}" ainda.`}
        hint="Passe pelo catálogo e use o botão sobre o pôster para marcar um filme."
        actionLabel="Ir para o catálogo"
      />
    )
  }

  // getMovieDetail traz filme e disponibilidade numa requisição só, cacheada
  // 24h — por isso a tabela guarda só o id, sem cópia de título ou pôster.
  const detalhes = await mapWithConcurrency(ids, CONCORRENCIA, (id) =>
    getMovieDetail(id).catch(() => null),
  )

  const movies: Movie[] = []
  const availability = new Map<number, AvailabilityLabel>()

  for (const detalhe of detalhes) {
    // Filme apagado do TMDB, ou requisição que falhou: sai da grade. A linha
    // continua no banco, sem incomodar ninguém.
    if (!detalhe) continue
    movies.push(detalhe)
    availability.set(
      detalhe.id,
      classifyAvailability(detalhe.availability, selectedIds),
    )
  }

  const marks = new Map(movies.map((movie) => [movie.id, state]))

  return (
    <MovieGrid
      movies={movies}
      availability={availability}
      marks={marks}
      signedIn
    />
  )
}
```

- [ ] **Step 6: Rodar a suite e o lint**

Run: `npm test`
Expected: PASS

Run: `npx tsc --noEmit`
Expected: sem erros

- [ ] **Step 7: Commit**

```bash
git add components/catalog/MovieGrid.tsx components/catalog/MovieGrid.test.tsx components/catalog/MarkedList.tsx
git commit -m "feat: adiciona grade com marcacoes e a lista marcada"
```

---

### Task 12: As duas rotas de lista

**Files:**
- Create: `app/quero-assistir/page.tsx`, `app/quero-assistir/loading.tsx`, `app/quero-assistir/error.tsx`
- Create: `app/assisti/page.tsx`, `app/assisti/loading.tsx`, `app/assisti/error.tsx`

**Interfaces:**
- Consumes: `MarkedList` (Task 11), `ListTabs` (Task 10)
- Produces: as rotas `/quero-assistir` e `/assisti`

- [ ] **Step 1: Ver os padrões já existentes**

Leia `app/search/loading.tsx` e `app/error.tsx` antes de escrever. As novas rotas seguem esses padrões — mesmo esqueleto, mesma linguagem de erro.

- [ ] **Step 2: Criar a rota "quero assistir"**

Criar `app/quero-assistir/page.tsx`:

```tsx
import { MarkedList } from '@/components/catalog/MarkedList'
import { ListTabs } from '@/components/layout/ListTabs'

export const metadata = {
  title: 'Quero assistir — CineBR',
}

export default function QueroAssistirPage() {
  return (
    <div className="wrap pt-10">
      <ListTabs active="want" />
      <div className="mt-10">
        <MarkedList state="want" />
      </div>
    </div>
  )
}
```

Criar `app/quero-assistir/loading.tsx`:

```tsx
import { GridSkeleton } from '@/components/catalog/GridSkeleton'
import { ListTabs } from '@/components/layout/ListTabs'

export default function Loading() {
  return (
    <div className="wrap pt-10">
      <ListTabs active="want" />
      <div className="mt-10">
        <GridSkeleton />
      </div>
    </div>
  )
}
```

Criar `app/quero-assistir/error.tsx`:

```tsx
'use client'

export default function Error({ reset }: { reset: () => void }) {
  return (
    <div className="wrap pt-16 text-center">
      <h1 className="text-xl text-projecao">
        Não consegui carregar sua lista.
      </h1>
      <p className="mt-2 text-sm text-nevoa">
        Seus filmes marcados continuam guardados. Foi a consulta que falhou.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-sm border border-borda px-4 py-2 text-sm text-projecao transition-colors hover:border-projecao/50"
      >
        Tentar de novo
      </button>
    </div>
  )
}
```

- [ ] **Step 3: Criar a rota "já assisti"**

Criar `app/assisti/page.tsx`:

```tsx
import { MarkedList } from '@/components/catalog/MarkedList'
import { ListTabs } from '@/components/layout/ListTabs'

export const metadata = {
  title: 'Já assisti — CineBR',
}

export default function AssistiPage() {
  return (
    <div className="wrap pt-10">
      <ListTabs active="watched" />
      <div className="mt-10">
        <MarkedList state="watched" />
      </div>
    </div>
  )
}
```

Criar `app/assisti/loading.tsx`:

```tsx
import { GridSkeleton } from '@/components/catalog/GridSkeleton'
import { ListTabs } from '@/components/layout/ListTabs'

export default function Loading() {
  return (
    <div className="wrap pt-10">
      <ListTabs active="watched" />
      <div className="mt-10">
        <GridSkeleton />
      </div>
    </div>
  )
}
```

Criar `app/assisti/error.tsx` com o mesmo conteúdo de `app/quero-assistir/error.tsx`.

- [ ] **Step 4: Conferir que compila**

Run: `npx tsc --noEmit`
Expected: sem erros

Run: `npm run lint`
Expected: sem erros

- [ ] **Step 5: Commit**

```bash
git add app/quero-assistir app/assisti
git commit -m "feat: adiciona as rotas das listas marcadas"
```

---

### Task 13: Ligar as marcações na home e no detalhe

**Files:**
- Modify: `app/page.tsx`, `app/movie/[id]/page.tsx`

**Interfaces:**
- Consumes: `getMarks`/`getCurrentUser` (Task 4), `ListTabs` (Task 10), `MarkButton` (Task 9), `MovieGrid` (Task 11)
- Produces: a funcionalidade visível

- [ ] **Step 1: Buscar marcações e usuário na home**

Em `app/page.tsx`, acrescentar aos imports:

```tsx
import { ListTabs } from '@/components/layout/ListTabs'
import { getCurrentUser, getMarks } from '@/lib/marks/queries'
import type { MarkState } from '@/lib/marks/types'
```

Trocar o bloco que busca em paralelo por:

```tsx
  const [selectedIds, allProviders, genres, marks, user] = await Promise.all([
    readSelectedProviderIds(),
    getRegionProviders(),
    getGenres(),
    getMarks(),
    getCurrentUser(),
  ])
```

E passar adiante nos dois modos, acrescentando às chamadas de `DiscoveryMode` e `FilteredMode`:

```tsx
          marks={marks}
          signedIn={user !== null}
```

- [ ] **Step 2: Mostrar as abas e o botão no modo descoberta**

Em `DiscoveryMode`, acrescentar ao tipo das props:

```tsx
  marks: ReadonlyMap<number, MarkState>
  signedIn: boolean
```

e à desestruturação. Depois, trocar o bloco da barra de filtros por:

```tsx
      <div className="wrap mt-6">
        <ListTabs active="discover" />
        <div className="mt-6">
          <FilterBar genres={genres} activeRating={minRating} />
        </div>
      </div>
```

E passar as marcações às fileiras, acrescentando às props de cada `<MovieRail>`:

```tsx
            marks={marks}
            signedIn={signedIn}
```

Em `components/catalog/MovieRail.tsx`, acrescentar as mesmas duas props à interface e repassá-las ao `MovieCard`, do mesmo jeito que a `MovieGrid` faz:

```tsx
            <MovieCard
              movie={movie}
              rank={ranked ? index + 1 : undefined}
              action={
                marks ? (
                  <MarkButton
                    movieId={movie.id}
                    current={marks.get(movie.id) ?? null}
                    signedIn={signedIn}
                  />
                ) : undefined
              }
            />
```

com os imports de `MarkButton` e do tipo `MarkState`.

- [ ] **Step 3: Ligar no modo filtrado**

Em `FilteredMode`, acrescentar as mesmas duas props ao tipo e à desestruturação, mostrar as abas acima da barra de filtros da mesma forma, e passar à grade:

```tsx
        <MovieGrid movies={movies} marks={marks} signedIn={signedIn} />
```

- [ ] **Step 4: Ligar na página de detalhe**

Em `app/movie/[id]/page.tsx`, acrescentar aos imports:

```tsx
import { MarkButton } from '@/components/catalog/MarkButton'
import { getCurrentUser, getMarks } from '@/lib/marks/queries'
```

Trocar o bloco que busca em paralelo por:

```tsx
  const [movie, selectedIds, marks, user] = await Promise.all([
    getMovieDetail(movieId),
    readSelectedProviderIds(),
    getMarks(),
    getCurrentUser(),
  ])
  if (!movie) notFound()
```

E, dentro da `<div className="min-w-0 pb-1">`, logo **depois** do bloco `<MetaLine ... />` que fecha os metadados do filme, acrescentar:

```tsx
            <div className="mt-5">
              <MarkButton
                movieId={movie.id}
                current={marks.get(movie.id) ?? null}
                signedIn={user !== null}
                variant="detail"
              />
            </div>
```

Aqui não há conflito de aninhamento: ao contrário do cartão, a página de detalhe não envolve nada num link.

- [ ] **Step 5: Rodar a suite inteira e o lint**

Run: `npm test`
Expected: PASS

Run: `npm run lint`
Expected: sem erros

Run: `npx tsc --noEmit`
Expected: sem erros

- [ ] **Step 6: Commit**

```bash
git add app/page.tsx app/movie/[id]/page.tsx components/catalog/MovieRail.tsx
git commit -m "feat: liga as marcacoes na home e na pagina de detalhe"
```

---

### Task 14: Verificação real e teste de ponta a ponta

**Files:**
- Modify: `e2e/catalog.spec.ts`, `README.md`

**Interfaces:**
- Consumes: tudo
- Produces: a feature verificada

- [ ] **Step 1: Conferir a marcação no navegador, de verdade**

Run: `npm run dev`

Com `http://localhost:3000` aberto:

1. O cabeçalho mostra **Entrar**
2. As três abas aparecem na home
3. Abrir **Quero assistir** sem conta: a página convida a entrar, não dá erro
4. Clicar em **Entrar** e completar o login com Google
5. De volta na home, o cabeçalho mostra seu primeiro nome e **Sair**
6. Clicar no botão sobre um pôster: ele muda para "Quero assistir" aceso
7. Abrir a aba **Quero assistir**: o filme está lá, com o selo de disponibilidade
8. Clicar no botão de novo: passa para "Já assisti"
9. O filme sai de "Quero assistir" e aparece em **Já assisti** — a prova de que o estado é um só
10. Clicar mais uma vez: desmarca, e o filme some das duas listas
11. Abrir a página de um filme: os dois botões aparecem separados
12. Clicar em **Sair**: o cabeçalho volta a mostrar Entrar

- [ ] **Step 2: Verificar a premissa de que não precisa de revalidatePath**

O passo 6 acima é a verificação: **o botão mudou de estado sem recarregar a página na mão?**

- **Mudou** → a premissa está certa e nada precisa ser feito. As rotas são dinâmicas e `getMarks` consulta o banco a cada renderização
- **Não mudou** → acrescentar ao final de `setMark`, em `app/actions.ts`:

  ```ts
  revalidatePath('/', 'layout')
  ```

  e registrar em comentário que isso também purga o cache de uma hora das consultas ao TMDB — custo aceito em troca da interface contar a verdade.

- [ ] **Step 3: Conferir o isolamento entre pessoas**

Esta é a verificação que a RLS existe para garantir, e ela **precisa** ser feita à mão.

Abra uma janela anônima, entre com uma segunda conta Google, marque um filme diferente. Volte à primeira janela e recarregue: **a marcação da segunda conta não pode aparecer.**

Se aparecer, pare tudo: a RLS não está funcionando, e nenhum outro trabalho importa até isso ser resolvido.

- [ ] **Step 4: Escrever o teste de ponta a ponta**

Acrescentar ao final de `e2e/catalog.spec.ts`:

```ts
test('mostra as abas e convida a entrar quem nao tem conta', async ({
  page,
}) => {
  await page.goto('/')

  // As abas aparecem para todo mundo: esconde-las de quem nao tem conta
  // esconderia a razao de criar uma.
  await expect(page.getByRole('link', { name: 'Quero assistir' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Já assisti' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Entrar' })).toBeVisible()

  await page.getByRole('link', { name: 'Quero assistir' }).click()
  await expect(page).toHaveURL(/quero-assistir/)

  // Sem conta a lista nao da erro: ela convida.
  await expect(page.getByText(/entre para montar suas listas/i)).toBeVisible()

  // O botao sobre o poster leva ao login, nao a um formulario quebrado.
  await page.goto('/')
  const marcar = page.getByRole('link', { name: /quero assistir — entre/i }).first()
  await expect(marcar).toHaveAttribute('href', '/auth/login')
})
```

- [ ] **Step 5: Rodar os testes de ponta a ponta**

Run: `npm run test:e2e`
Expected: PASS, os três testes

**Limitação registrada:** este teste cobre só o caminho anônimo. Automatizar o login do Google exigiria credenciais de teste e driblar a proteção anti-robô do próprio Google — trabalho desproporcional aqui. O caminho logado está coberto pelos testes unitários e pela conferência manual do Step 1.

- [ ] **Step 6: Atualizar o README**

Em `README.md`, na seção "Rodando localmente", acrescentar depois do passo do token do TMDB:

```markdown
5. Crie um projeto no [Supabase](https://supabase.com), rode a migração de
   `docs/superpowers/specs/2026-09-06-contas-e-listas-design.md` e preencha
   `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`
6. Em Authentication → Providers, ative o Google com credenciais OAuth do
   Google Cloud, e autorize `http://localhost:3000/auth/callback`
```

E acrescentar uma seção nova antes de "Testes":

```markdown
## Contas e listas

Com uma conta — login pelo Google — dá para marcar filmes como **quero
assistir** ou **já assisti**, e navegar pelas duas listas nas abas da home.
Cada filme tem um estado só: marcar como assistido tira de "quero assistir".

Sem conta, o site inteiro continua funcionando. Só as listas pedem login.

As marcações ficam no Postgres do Supabase, com Row Level Security: a regra
de que cada pessoa só enxerga as próprias linhas vive no banco, não apenas no
código da aplicação.
```

- [ ] **Step 7: Commit**

```bash
git add e2e/catalog.spec.ts README.md
git commit -m "test: cobre o caminho anonimo das listas e documenta as contas"
```

---

### Task 15: Publicar

**Files:** nenhum

- [ ] **Step 1: Configurar as variáveis na Vercel**

No painel do projeto `cine-br`, em Settings → Environment Variables, acrescentar `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` com os mesmos valores do `.env.local`.

- [ ] **Step 2: Autorizar o domínio de produção no Supabase**

Em Authentication → URL Configuration, confirmar que `https://cine-br.vercel.app/auth/callback` está na lista de URLs de retorno. Sem isso, o login funciona em desenvolvimento e falha em produção.

- [ ] **Step 3: Rodar o build de produção localmente antes de enviar**

Run: `npm run build`
Expected: build conclui, com as rotas `/quero-assistir`, `/assisti`, `/auth/login` e `/auth/callback` listadas

- [ ] **Step 4: Enviar**

```bash
git push
```

- [ ] **Step 5: Verificar em produção**

Abrir `https://cine-br.vercel.app`, entrar com o Google, marcar um filme e conferir que ele aparece na aba. É a mesma verificação do Step 1 da Task 14, agora no ambiente real — e é a única forma de saber que as URLs de retorno estão certas.

---

## Verificação final

- [ ] `npm test` — toda a suíte verde
- [ ] `npm run lint` — sem erros
- [ ] `npx tsc --noEmit` — sem erros
- [ ] `npm run test:e2e` — os três testes verdes
- [ ] `npm run build` — build de produção conclui
- [ ] Isolamento entre duas contas conferido à mão (Task 14, Step 3)
- [ ] `git status --short` — árvore limpa, `.env.local` não aparece
- [ ] Login funciona em produção
