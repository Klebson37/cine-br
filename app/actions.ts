'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import {
  COOKIE_MAX_AGE_SECONDS,
  PROVIDERS_COOKIE,
  serializeProviderCookie,
} from '@/lib/preferences'

export async function saveProviders(formData: FormData): Promise<void> {
  const ids = formData
    .getAll('providers')
    .map((value) => Number.parseInt(String(value), 10))
    .filter((id) => Number.isInteger(id) && id > 0)

  const store = await cookies()
  store.set(PROVIDERS_COOKIE, serializeProviderCookie(ids), {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE_SECONDS,
    path: '/',
  })

  revalidatePath('/')
}
