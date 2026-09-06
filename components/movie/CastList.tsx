import Image from 'next/image'
import type { CastMember } from '@/lib/catalog/types'

interface CastListProps {
  cast: CastMember[]
}

export function CastList({ cast }: CastListProps) {
  if (cast.length === 0) return null

  return (
    <section>
      <h2 className="titulo-secao text-lg text-projecao">Elenco principal</h2>

      <ul className="fita mt-4 flex gap-3 overflow-x-auto pb-3">
        {cast.map((member) => (
          <li key={member.id} className="w-[5.5rem] shrink-0">
            {/* Retrato retangular, como os pôsteres: o mesmo objeto físico
                em outra proporção, em vez de um avatar redondo. */}
            <div className="relative aspect-[3/4] overflow-hidden rounded-[2px] bg-sala ring-1 ring-inset ring-borda/70">
              {member.photoUrl && (
                <Image
                  src={member.photoUrl}
                  alt=""
                  fill
                  sizes="88px"
                  className="object-cover"
                />
              )}
            </div>
            <p className="mt-2 text-xs font-medium leading-snug text-projecao/85">
              {member.name}
            </p>
            <p className="mt-0.5 text-xs leading-snug text-nevoa">
              {member.character}
            </p>
          </li>
        ))}
      </ul>
    </section>
  )
}
