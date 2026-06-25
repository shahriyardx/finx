import { eq } from 'drizzle-orm'
import { useLiveQuery } from 'drizzle-orm/expo-sqlite'

import { db } from '@/db/client'
import { settings } from '@/db/schema'

/** Reactive app-wide currency code (defaults to USD until set). */
export function useCurrency(): string {
  const { data } = useLiveQuery(db.select().from(settings).where(eq(settings.key, 'currency')))
  return data?.[0]?.value ?? 'BDT'
}
