import { gte } from 'drizzle-orm'
import { useLiveQuery } from 'drizzle-orm/expo-sqlite'
import { useEffect } from 'react'

import { db } from '@/db/client'
import { transactions, wallets } from '@/db/schema'
import { updateBalanceWidget } from '@/widgets/update'

function monthStart(): number {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime()
}

/**
 * Keeps the Android home-screen balance widget in sync: re-pushes whenever a
 * wallet balance or this month's transactions change. Mounted once at root.
 */
export function WidgetUpdater() {
  const { data: ws } = useLiveQuery(db.select().from(wallets))
  const { data: txs } = useLiveQuery(db.select().from(transactions).where(gte(transactions.date, monthStart())))

  useEffect(() => {
    updateBalanceWidget()
  }, [ws, txs])

  return null
}
