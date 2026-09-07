import Link from 'next/link'
import { signOut } from '@/app/actions'
import type { CurrentUser } from '@/lib/marks/queries'
import { BOTAO_CABECALHO } from './chrome'

export function AuthButton({ user }: { user: CurrentUser | null }) {
  if (!user) {
    return (
      <Link href="/auth/login" className={BOTAO_CABECALHO}>
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
        <button type="submit" className={BOTAO_CABECALHO}>
          Sair
        </button>
      </form>
    </div>
  )
}
