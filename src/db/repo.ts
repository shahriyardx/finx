import { and, eq, sql } from 'drizzle-orm'

import { db } from '@/db/client'
import { debtPayments, debts, type NewPerson, persons, settings, transactions, transfers, wallets } from '@/db/schema'

/** Epoch-ms helper kept in one place so tests/screens stay consistent. */
const now = () => Date.now()

// ----------------------------------------------------------------------------
// Wallets
// ----------------------------------------------------------------------------

export async function createWallet(input: {
  name: string
  color?: string
  icon?: string
  opening?: number
  smsSender?: string | null
}) {
  await db.insert(wallets).values({
    name: input.name,
    color: input.color,
    icon: input.icon,
    balance: input.opening ?? 0,
    smsSender: input.smsSender ?? null,
    createdAt: now(),
  })
}

export async function updateWallet(
  id: number,
  input: { name?: string; color?: string; icon?: string; smsSender?: string | null },
) {
  await db.update(wallets).set(input).where(eq(wallets.id, id))
}

export async function deleteWallet(id: number) {
  await db.delete(wallets).where(eq(wallets.id, id))
}

/** Find the wallet mapped to a given bank-SMS sender id. */
export async function findWalletBySmsSender(smsSender: string) {
  const [row] = await db.select().from(wallets).where(eq(wallets.smsSender, smsSender)).limit(1)
  return row ?? null
}

// ----------------------------------------------------------------------------
// Transactions — adjust wallet balance atomically
// ----------------------------------------------------------------------------

export async function addTransaction(input: {
  walletId: number
  type: 'income' | 'expense'
  amount: number // positive minor units
  category?: string
  note?: string
  receipt?: string | null
  date?: number
}) {
  const delta = input.type === 'income' ? input.amount : -input.amount
  await db.transaction(async (tx) => {
    await tx.insert(transactions).values({
      walletId: input.walletId,
      type: input.type,
      amount: input.amount,
      category: input.category ?? 'other',
      note: input.note,
      receipt: input.receipt ?? null,
      date: input.date ?? now(),
      createdAt: now(),
    })
    await tx
      .update(wallets)
      .set({ balance: sql`${wallets.balance} + ${delta}` })
      .where(eq(wallets.id, input.walletId))
  })
}

/**
 * Edit an existing transaction. Reverses the old wallet effect and applies the
 * new one atomically, so changing the amount, type, or wallet keeps every
 * balance correct. Any field left undefined is preserved.
 */
export async function updateTransaction(
  id: number,
  input: {
    walletId?: number
    type?: 'income' | 'expense'
    amount?: number // positive minor units
    category?: string
    note?: string | null
    receipt?: string | null
    date?: number
  },
) {
  await db.transaction(async (tx) => {
    const [old] = await tx.select().from(transactions).where(eq(transactions.id, id))
    if (!old) throw new Error('transaction not found')

    const next = {
      walletId: input.walletId ?? old.walletId,
      type: input.type ?? old.type,
      amount: input.amount ?? old.amount,
    }

    // Reverse the old row's effect on its wallet, then apply the new one. Done
    // as two updates so a wallet change moves money off one and onto the other.
    const oldDelta = old.type === 'income' ? old.amount : -old.amount
    const newDelta = next.type === 'income' ? next.amount : -next.amount
    await tx
      .update(wallets)
      .set({ balance: sql`${wallets.balance} - ${oldDelta}` })
      .where(eq(wallets.id, old.walletId))
    await tx
      .update(wallets)
      .set({ balance: sql`${wallets.balance} + ${newDelta}` })
      .where(eq(wallets.id, next.walletId))

    await tx
      .update(transactions)
      .set({
        walletId: next.walletId,
        type: next.type,
        amount: next.amount,
        category: input.category ?? old.category,
        note: input.note !== undefined ? input.note : old.note,
        receipt: input.receipt !== undefined ? input.receipt : old.receipt,
        date: input.date ?? old.date,
      })
      .where(eq(transactions.id, id))
  })
}

export async function deleteTransaction(id: number) {
  await db.transaction(async (tx) => {
    const [row] = await tx.select().from(transactions).where(eq(transactions.id, id))
    if (!row) return
    const reverse = row.type === 'income' ? -row.amount : row.amount
    await tx
      .update(wallets)
      .set({ balance: sql`${wallets.balance} + ${reverse}` })
      .where(eq(wallets.id, row.walletId))
    await tx.delete(transactions).where(eq(transactions.id, id))
  })
}

// ----------------------------------------------------------------------------
// Transfers — move money between two wallets atomically
// ----------------------------------------------------------------------------

export async function createTransfer(input: {
  fromWalletId: number
  toWalletId: number
  amount: number // positive minor units
  note?: string
  date?: number
}) {
  if (input.fromWalletId === input.toWalletId) throw new Error('Pick two different wallets.')
  if (input.amount <= 0) throw new Error('Amount must be greater than zero.')
  await db.transaction(async (tx) => {
    await tx.insert(transfers).values({
      fromWalletId: input.fromWalletId,
      toWalletId: input.toWalletId,
      amount: input.amount,
      note: input.note,
      date: input.date ?? now(),
      createdAt: now(),
    })
    await tx
      .update(wallets)
      .set({ balance: sql`${wallets.balance} - ${input.amount}` })
      .where(eq(wallets.id, input.fromWalletId))
    await tx
      .update(wallets)
      .set({ balance: sql`${wallets.balance} + ${input.amount}` })
      .where(eq(wallets.id, input.toWalletId))
  })
}

/** Undo a transfer: move the money back and remove the record. */
export async function deleteTransfer(id: number) {
  await db.transaction(async (tx) => {
    const [row] = await tx.select().from(transfers).where(eq(transfers.id, id))
    if (!row) return
    await tx
      .update(wallets)
      .set({ balance: sql`${wallets.balance} + ${row.amount}` })
      .where(eq(wallets.id, row.fromWalletId))
    await tx
      .update(wallets)
      .set({ balance: sql`${wallets.balance} - ${row.amount}` })
      .where(eq(wallets.id, row.toWalletId))
    await tx.delete(transfers).where(eq(transfers.id, id))
  })
}

// ----------------------------------------------------------------------------
// Persons
// ----------------------------------------------------------------------------

export async function createPerson(input: Omit<NewPerson, 'id' | 'createdAt'>) {
  await db.insert(persons).values({ ...input, createdAt: now() })
}

export async function updatePerson(
  id: number,
  input: { name?: string; phone?: string | null; note?: string | null; avatar?: string | null },
) {
  await db.update(persons).set(input).where(eq(persons.id, id))
}

export async function deletePerson(id: number) {
  await db.delete(persons).where(eq(persons.id, id))
}

// ----------------------------------------------------------------------------
// Debts — lend deducts from wallet, borrow adds to wallet
// ----------------------------------------------------------------------------

export async function createDebt(input: {
  personId: number
  walletId?: number | null // null = tracking-only, does not move a wallet
  type: 'lend' | 'borrow'
  amount: number // positive minor units
  note?: string
  date?: number
}) {
  const walletId = input.walletId ?? null
  // lend = money leaves wallet; borrow = money enters wallet.
  const delta = input.type === 'lend' ? -input.amount : input.amount
  await db.transaction(async (tx) => {
    await tx.insert(debts).values({
      personId: input.personId,
      walletId,
      type: input.type,
      principal: input.amount,
      outstanding: input.amount,
      note: input.note,
      date: input.date ?? now(),
      status: 'open',
      createdAt: now(),
    })
    if (walletId !== null) {
      await tx
        .update(wallets)
        .set({ balance: sql`${wallets.balance} + ${delta}` })
        .where(eq(wallets.id, walletId))
    }
  })
}

/**
 * Record a repayment against a debt.
 * - lend (they repay you)  → wallet += amount, outstanding -= amount
 * - borrow (you repay them) → wallet -= amount, outstanding -= amount
 * Pays into the supplied wallet (defaults to the debt's wallet).
 */
export async function recordPayment(input: {
  debtId: number
  amount: number
  walletId?: number | null // null = cash, does not move a wallet
  date?: number
}) {
  await db.transaction(async (tx) => {
    const [debt] = await tx.select().from(debts).where(eq(debts.id, input.debtId))
    if (!debt) throw new Error('debt not found')

    const pay = Math.min(input.amount, debt.outstanding)
    // Explicit wallet wins; else fall back to the debt's wallet (may itself be null).
    const walletId = input.walletId !== undefined ? input.walletId : debt.walletId
    const delta = debt.type === 'lend' ? pay : -pay
    const newOutstanding = debt.outstanding - pay

    await tx.insert(debtPayments).values({
      debtId: debt.id,
      walletId: walletId ?? null,
      amount: pay,
      date: input.date ?? now(),
      createdAt: now(),
    })
    if (walletId != null) {
      await tx
        .update(wallets)
        .set({ balance: sql`${wallets.balance} + ${delta}` })
        .where(eq(wallets.id, walletId))
    }
    await tx
      .update(debts)
      .set({ outstanding: newOutstanding, status: newOutstanding <= 0 ? 'settled' : 'open' })
      .where(eq(debts.id, debt.id))
  })
}

export async function deleteDebt(id: number) {
  await db.delete(debts).where(eq(debts.id, id))
}

/** Undo a repayment: restore outstanding, reverse the wallet move, reopen if needed. */
export async function deletePayment(paymentId: number) {
  await db.transaction(async (tx) => {
    const [pay] = await tx.select().from(debtPayments).where(eq(debtPayments.id, paymentId))
    if (!pay) return
    const [debt] = await tx.select().from(debts).where(eq(debts.id, pay.debtId))
    if (debt) {
      const newOutstanding = debt.outstanding + pay.amount
      if (pay.walletId != null) {
        // Reverse the original effect: lend added to wallet, borrow subtracted.
        const delta = debt.type === 'lend' ? -pay.amount : pay.amount
        await tx
          .update(wallets)
          .set({ balance: sql`${wallets.balance} + ${delta}` })
          .where(eq(wallets.id, pay.walletId))
      }
      await tx
        .update(debts)
        .set({ outstanding: newOutstanding, status: newOutstanding > 0 ? 'open' : 'settled' })
        .where(eq(debts.id, debt.id))
    }
    await tx.delete(debtPayments).where(eq(debtPayments.id, paymentId))
  })
}

// ----------------------------------------------------------------------------
// Settings (key/value)
// ----------------------------------------------------------------------------

export async function getSetting(key: string): Promise<string | null> {
  const [row] = await db.select().from(settings).where(eq(settings.key, key))
  return row?.value ?? null
}

export async function setSetting(key: string, value: string) {
  await db.insert(settings).values({ key, value }).onConflictDoUpdate({ target: settings.key, set: { value } })
}

// ----------------------------------------------------------------------------
// Bulk reset
// ----------------------------------------------------------------------------

export type ResetSelection = {
  wallets?: boolean
  people?: boolean
  debts?: boolean
  transactions?: boolean
}

/**
 * Permanently delete the selected data sets.
 * - wallets       → wallets + their transactions (cascade); debt links nulled
 * - people        → persons + their debts + payments (cascade)
 * - debts         → all debts + payments (cascade)
 * - transactions  → all transactions, and every remaining wallet balance reset to 0
 */
export async function resetData(sel: ResetSelection) {
  // NOTE: a bare `DELETE FROM t` triggers SQLite's truncate optimization, which
  // skips the row update-hook — so expo-sqlite's change listener never fires and
  // useLiveQuery won't refresh until restart. An always-true WHERE forces
  // per-row deletes and proper change notifications.
  const all = sql`1 = 1`
  await db.transaction(async (tx) => {
    if (sel.wallets) await tx.delete(wallets).where(all) // cascades to transfers
    if (sel.people) await tx.delete(persons).where(all)
    if (sel.debts) await tx.delete(debts).where(all)
    if (sel.transactions) {
      await tx.delete(transactions).where(all)
      // Transfers also move balances; clear them so zeroed balances stay consistent.
      await tx.delete(transfers).where(all)
      await tx.update(wallets).set({ balance: 0 })
    }
  })
}

// ----------------------------------------------------------------------------
// Backup: export / import
// ----------------------------------------------------------------------------

export type BackupData = {
  app: 'finx'
  version: number
  exportedAt: number
  wallets: (typeof wallets.$inferSelect)[]
  transactions: (typeof transactions.$inferSelect)[]
  transfers: (typeof transfers.$inferSelect)[]
  persons: (typeof persons.$inferSelect)[]
  debts: (typeof debts.$inferSelect)[]
  debtPayments: (typeof debtPayments.$inferSelect)[]
  settings: (typeof settings.$inferSelect)[]
}

export async function exportData(): Promise<BackupData> {
  const [w, t, tr, p, d, dp, s] = await Promise.all([
    db.select().from(wallets),
    db.select().from(transactions),
    db.select().from(transfers),
    db.select().from(persons),
    db.select().from(debts),
    db.select().from(debtPayments),
    db.select().from(settings),
  ])
  return {
    app: 'finx',
    version: 2,
    exportedAt: now(),
    wallets: w,
    transactions: t,
    transfers: tr,
    persons: p,
    debts: d,
    debtPayments: dp,
    settings: s,
  }
}

function isBackup(x: unknown): x is BackupData {
  const b = x as Partial<BackupData> | null
  // `transfers` was added in v2; older backups omit it, so it's not required.
  return (
    !!b &&
    b.app === 'finx' &&
    Array.isArray(b.wallets) &&
    Array.isArray(b.transactions) &&
    Array.isArray(b.persons) &&
    Array.isArray(b.debts) &&
    Array.isArray(b.debtPayments) &&
    Array.isArray(b.settings)
  )
}

/** Replace ALL existing data with the backup. Throws on an invalid payload. */
export async function importData(raw: unknown): Promise<{
  wallets: number
  transactions: number
  persons: number
  debts: number
}> {
  if (!isBackup(raw)) throw new Error('Not a valid FinX backup file.')
  const data = raw
  const all = sql`1 = 1`
  const transfersIn = Array.isArray(data.transfers) ? data.transfers : []
  await db.transaction(async (tx) => {
    // Wipe children → parents (FK order). WHERE 1=1 keeps live queries fresh.
    await tx.delete(debtPayments).where(all)
    await tx.delete(debts).where(all)
    await tx.delete(transfers).where(all)
    await tx.delete(transactions).where(all)
    await tx.delete(wallets).where(all)
    await tx.delete(persons).where(all)
    await tx.delete(settings).where(all)

    // Insert parents → children. Explicit ids preserve the FK graph.
    if (data.persons.length) await tx.insert(persons).values(data.persons)
    if (data.wallets.length) await tx.insert(wallets).values(data.wallets)
    if (data.settings.length) await tx.insert(settings).values(data.settings)
    if (data.debts.length) await tx.insert(debts).values(data.debts)
    if (data.transactions.length) await tx.insert(transactions).values(data.transactions)
    if (transfersIn.length) await tx.insert(transfers).values(transfersIn)
    if (data.debtPayments.length) await tx.insert(debtPayments).values(data.debtPayments)
  })
  return {
    wallets: data.wallets.length,
    transactions: data.transactions.length,
    persons: data.persons.length,
    debts: data.debts.length,
  }
}

export { and, eq, sql }
