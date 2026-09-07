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
