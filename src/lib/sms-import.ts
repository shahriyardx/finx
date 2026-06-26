import { and, eq, gte } from 'drizzle-orm'

import { db } from '@/db/client'
import { addTransaction, findWalletBySmsSender, getSetting } from '@/db/repo'
import { transactions } from '@/db/schema'
import { bankForSender } from '@/lib/banks'
import { notifyTxImported, setupNotifications } from '@/lib/notifications'

/** Settings key for the "auto-import bank SMS" toggle. */
export const SMS_IMPORT_KEY = 'sms_import'

export type IncomingSms = { sender: string; body: string }

/**
 * Import a single bank SMS: match the bank, parse it, add a transaction to the
 * mapped wallet, and post a notification. Shared by the live in-app listener and
 * the headless (app-killed) receiver, so it is dedup- and toggle-aware.
 */
export async function importSms({ sender, body }: IncomingSms): Promise<void> {
  if ((await getSetting(SMS_IMPORT_KEY)) !== '1') return

  const bank = bankForSender(sender)
  if (!bank) return
  const parsed = bank.parse(body)
  if (!parsed) return

  const wallet = await findWalletBySmsSender(bank.id)
  if (!wallet) return

  // Skip if the same message was already imported in the last 2 minutes — the
  // live listener and the headless receiver can both fire for one SMS.
  const since = Date.now() - 120_000
  const [dupe] = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(and(eq(transactions.smsBody, body), gte(transactions.createdAt, since)))
    .limit(1)
  if (dupe) return

  const txId = await addTransaction({
    walletId: wallet.id,
    type: parsed.type,
    amount: parsed.amount,
    category: 'other',
    note: parsed.note,
    smsBody: body,
  })

  await setupNotifications()
  const currency = (await getSetting('currency')) ?? undefined
  await notifyTxImported({
    txId,
    type: parsed.type,
    amount: parsed.amount,
    walletName: wallet.name,
    note: parsed.note,
    currency,
  })
}

/** Headless task entry (registered in index.js) for app-killed SMS delivery. */
export function smsImportTask(data: IncomingSms) {
  return importSms(data).catch(() => {
    // Swallow: a failed background import must not crash the headless task.
  })
}
