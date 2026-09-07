import type { Availability } from './types'

export type AvailabilityLabel =
  | 'subscription'
  | 'free'
  | 'paid'
  | 'unavailable'

export const AVAILABILITY_TEXT: Record<AvailabilityLabel, string> = {
  subscription: 'Na sua assinatura',
  free: 'De graça',
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

  // Grátis vem antes de "aluguel ou compra" mesmo quando o serviço não está
  // marcado: não custa nada, então não há o que escolher — e chamar de
  // "pago" o que é gratuito seria a pior mentira que este selo poderia dar.
  if (availability.free.length > 0) return 'free'

  const anywhere =
    availability.flatrate.length > 0 ||
    availability.rent.length > 0 ||
    availability.buy.length > 0

  return anywhere ? 'paid' : 'unavailable'
}
