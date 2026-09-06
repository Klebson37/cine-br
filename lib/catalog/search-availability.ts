import type { Availability } from './types'

export type AvailabilityLabel = 'subscription' | 'paid' | 'unavailable'

export const AVAILABILITY_TEXT: Record<AvailabilityLabel, string> = {
  subscription: 'Na sua assinatura',
  paid: 'Aluguel ou compra',
  unavailable: 'Indisponível no Brasil',
}

export function classifyAvailability(
  availability: Availability,
  selectedIds: number[],
): AvailabilityLabel {
  const inSubscription = availability.flatrate.some((provider) =>
    selectedIds.includes(provider.id),
  )
  if (inSubscription) return 'subscription'

  const anywhere =
    availability.flatrate.length > 0 ||
    availability.rent.length > 0 ||
    availability.buy.length > 0

  return anywhere ? 'paid' : 'unavailable'
}
