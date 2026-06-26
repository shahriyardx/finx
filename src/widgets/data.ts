import { eq, gte } from 'drizzle-orm'

import { db } from '@/db/client'
import { settings, transactions, wallets } from '@/db/schema'
import type { BalanceWidgetData } from './balance-widget'

function monthStart(): number {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime()
}

/** Compute the figures shown on the balance widget straight from the DB. */
export async function getWidgetData(): Promise<BalanceWidgetData> {
  const ws = await db.select().from(wallets)
  const total = ws.reduce((s, w) => s + w.balance, 0)

  const txs = await db.select().from(transactions).where(gte(transactions.date, monthStart()))
  const income = txs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const spend = txs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

  const [c] = await db.select().from(settings).where(eq(settings.key, 'currency'))
  return { total, income, spend, currency: c?.value ?? 'BDT' }
}
