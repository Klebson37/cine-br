import {
  AVAILABILITY_TEXT,
  type AvailabilityLabel,
} from '@/lib/catalog/search-availability'

/** Régua sob o pôster, não pílula flutuante: a largura da barra já diz
 *  quanto o filme está ao seu alcance antes de a legenda ser lida. */
const RULE: Record<AvailabilityLabel, string> = {
  subscription: 'w-full bg-luz',
  paid: 'w-1/3 bg-cobranca/80',
  unavailable: 'w-[15%] bg-borda',
}

const TEXT: Record<AvailabilityLabel, string> = {
  subscription: 'text-luz',
  paid: 'text-cobranca/90',
  unavailable: 'text-nevoa',
}

export function AvailabilityBadge({ label }: { label: AvailabilityLabel }) {
  return (
    <span className="mt-2 block">
      <span className="block h-[3px] w-full bg-borda/40">
        <span className={`block h-full ${RULE[label]}`} />
      </span>
      <span className={`mt-1.5 block text-[0.6875rem] ${TEXT[label]}`}>
        {AVAILABILITY_TEXT[label]}
      </span>
    </span>
  )
}
