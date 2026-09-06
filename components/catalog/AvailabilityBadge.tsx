import {
  AVAILABILITY_TEXT,
  type AvailabilityLabel,
} from '@/lib/catalog/search-availability'

const STYLES: Record<AvailabilityLabel, string> = {
  subscription: 'bg-emerald-500/20 text-emerald-300',
  paid: 'bg-amber-500/20 text-amber-300',
  unavailable: 'bg-neutral-700/40 text-neutral-400',
}

export function AvailabilityBadge({ label }: { label: AvailabilityLabel }) {
  return (
    <span
      className={`mt-1 inline-block rounded px-2 py-0.5 text-[10px] ${STYLES[label]}`}
    >
      {AVAILABILITY_TEXT[label]}
    </span>
  )
}
