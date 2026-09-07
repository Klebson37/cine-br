import Image from 'next/image'
import { RailStrip } from '@/components/catalog/RailStrip'
import { initials } from '@/lib/catalog/format'
import type { CastMember } from '@/lib/catalog/types'

interface CastListProps {
  cast: CastMember[]
}

export function CastList({ cast }: CastListProps) {
  if (cast.length === 0) return null

  return (
    <section>
      <h2 className="titulo-secao text-lg text-projecao">Elenco principal</h2>

      {/* A mesma fita das fileiras do catálogo, com as mesmas setas: antes
          era preciso descobrir sozinho que dava para arrastar, e no celular
          não havia sinal nenhum de que existia mais gente à direita.
          As setas se alinham ao centro do retrato, não da caixa toda. */}
      <div className="mt-4">
        <RailStrip sangra={false} alturaSeta="top-[4rem]" papel="list">
          {cast.map((member) => (
            <div key={member.id} role="listitem" className="w-[5.5rem] shrink-0">
              {/* Retrato retangular, como os pôsteres: o mesmo objeto físico
                  em outra proporção, em vez de um avatar redondo. */}
              <div className="relative aspect-[3/4] overflow-hidden rounded-[2px] bg-sala ring-1 ring-inset ring-borda/70">
                {member.photoUrl ? (
                  <Image
                    src={member.photoUrl}
                    alt=""
                    fill
                    sizes="88px"
                    className="object-cover"
                  />
                ) : (
                  // O TMDB não tem retrato de todo mundo. Um quadro vazio
                  // parece falha de carregamento; as iniciais mostram que a
                  // ausência é da fonte, não da tela.
                  <span
                    aria-hidden
                    className="absolute inset-0 flex items-center justify-center text-sm font-semibold tracking-wide text-nevoa"
                  >
                    {initials(member.name)}
                  </span>
                )}
              </div>

              {/* Duas linhas reservadas para o nome e uma para o papel: sem
                  isso um nome comprido empurrava o papel para baixo e a fita
                  terminava em degraus. */}
              <p className="mt-2 line-clamp-2 min-h-[2.1rem] text-xs font-medium leading-snug text-projecao/85">
                {member.name}
              </p>
              <p className="mt-0.5 line-clamp-1 text-xs leading-snug text-nevoa">
                {member.character}
              </p>
            </div>
          ))}
        </RailStrip>
      </div>
    </section>
  )
}
