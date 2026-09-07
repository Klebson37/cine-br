import Image from 'next/image'
import {
  melhorOpcaoParaAssistir,
  rotuloDeAssistir,
} from '@/lib/catalog/assistir'
import type { Availability } from '@/lib/catalog/types'

interface BotaoAssistirProps {
  availability: Availability
  title: string
  selectedIds?: number[]
}

/** O caminho mais curto do cartaz até a tela.
 *
 *  Um toque abre o serviço já no título — no celular, o próprio aplicativo,
 *  porque esses endereços são links universais. O site não reproduz o filme
 *  e não tenta parecer que reproduz: isso exigiria licença de distribuição
 *  do detentor dos direitos, que é o que a Netflix paga para existir.
 *
 *  Dourado só quando o filme já está incluído no que a pessoa assina. No
 *  site inteiro o dourado quer dizer "isso é seu", e um botão aceso levando
 *  a uma tela de assinatura quebraria a promessa. */
export function BotaoAssistir({
  availability,
  title,
  selectedIds = [],
}: BotaoAssistirProps) {
  const opcao = melhorOpcaoParaAssistir(availability, title, selectedIds)

  // Sem lugar para assistir, sem botão. Um botão desabilitado seria só uma
  // promessa quebrada ocupando espaço.
  if (opcao === null) return null

  // Aceso quando nao custa nada a mais: o que ela ja assina, ou o que e
  // gratuito. Dourado no site inteiro quer dizer "isso e seu".
  const aceso = opcao.modo === 'minha' || opcao.modo === 'gratis'

  return (
    <a
      href={opcao.href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${rotuloDeAssistir(opcao)} — abre em nova aba`}
      className={`group/assistir inline-flex h-10 shrink-0 items-center gap-2 rounded-sm px-4 text-sm font-semibold transition-all ${
        aceso
          ? 'bg-luz text-tinta shadow-[0_8px_24px_-8px_rgba(255,194,75,0.85)] hover:-translate-y-px hover:bg-[#ffcf6b]'
          : 'border border-projecao/25 bg-tinta/60 text-projecao backdrop-blur-md hover:border-luz/60 hover:text-luz'
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden
        className="size-4 shrink-0"
        fill="currentColor"
      >
        <path d="M8 5.4v13.2L19 12z" />
      </svg>

      {rotuloDeAssistir(opcao)}

      {opcao.provider.logoUrl && (
        <Image
          src={opcao.provider.logoUrl}
          alt=""
          width={18}
          height={18}
          className="shrink-0 rounded-[3px]"
        />
      )}
    </a>
  )
}
