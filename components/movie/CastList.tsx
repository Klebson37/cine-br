import Image from 'next/image'
import type { CastMember } from '@/lib/catalog/types'

interface CastListProps {
  cast: CastMember[]
}

export function CastList({ cast }: CastListProps) {
  if (cast.length === 0) return null

  return (
    <section className="mt-8">
      <h2 className="mb-4 text-xl font-semibold">Elenco principal</h2>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {cast.map((member) => (
          <div key={member.id} className="w-24 shrink-0 text-center">
            <div className="relative mb-2 aspect-square overflow-hidden rounded-full bg-neutral-800">
              {member.photoUrl && (
                <Image
                  src={member.photoUrl}
                  alt={member.name}
                  fill
                  sizes="96px"
                  className="object-cover"
                />
              )}
            </div>
            <p className="text-xs text-neutral-200">{member.name}</p>
            <p className="text-xs text-neutral-500">{member.character}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
