import { and, eq, sql } from 'drizzle-orm';

import { db } from '@/db/client';
import {
  debtPayments,
  debts,
  persons,
  settings,
  transactions,
  wallets,
  type NewPerson,
} from '@/db/schema';

/** Epoch-ms helper kept in one place so tests/screens stay consistent. */
const now = () => Date.now();

// ----------------------------------------------------------------------------
// Wallets
// ----------------------------------------------------------------------------

export async function createWallet(input: { name: string; color?: string; icon?: string; opening?: number }) {
  await db.insert(wallets).values({
    name: input.name,
    color: input.color,
    icon: input.icon,
    balance: input.opening ?? 0,
    createdAt: now(),
  });
}

export async function updateWallet(id: number, input: { name?: string; color?: string; icon?: string }) {
  await db.update(wallets).set(input).where(eq(wallets.id, id));
}

export async function deleteWallet(id: number) {
  await db.delete(wallets).where(eq(wallets.id, id));
}

// ----------------------------------------------------------------------------
// Transactions — adjust wallet balance atomically
// ----------------------------------------------------------------------------

export async function addTransaction(input: {
  walletId: number;
  type: 'income' | 'expense';
  amount: number; // positive minor units
  category?: string;
  note?: string;
  date?: number;
}) {
  const delta = input.type === 'income' ? input.amount : -input.amount;
  await db.transaction(async (tx) => {
    await tx.insert(transactions).values({
      walletId: input.walletId,
      type: input.type,
      amount: input.amount,
      category: input.category ?? 'other',
      note: input.note,
      date: input.date ?? now(),
      createdAt: now(),
    });
    await tx
      .update(wallets)
      .set({ balance: sql`${wallets.balance} + ${delta}` })
      .where(eq(wallets.id, input.walletId));
  });
}

export async function deleteTransaction(id: number) {
  await db.transaction(async (tx) => {
    const [row] = await tx.select().from(transactions).where(eq(transactions.id, id));
    if (!row) return;
    const reverse = row.type === 'income' ? -row.amount : row.amount;
    await tx
      .update(wallets)
      .set({ balance: sql`${wallets.balance} + ${reverse}` })
      .where(eq(wallets.id, row.walletId));
    await tx.delete(transactions).where(eq(transactions.id, id));
  });
}

// ----------------------------------------------------------------------------
// Persons
// ----------------------------------------------------------------------------

export async function createPerson(input: Omit<NewPerson, 'id' | 'createdAt'>) {
  await db.insert(persons).values({ ...input, createdAt: now() });
}

export async function updatePerson(
  id: number,
  input: { name?: string; phone?: string | null; note?: string | null; avatar?: string | null },
) {
  await db.update(persons).set(input).where(eq(persons.id, id));
}

export async function deletePerson(id: number) {
  await db.delete(persons).where(eq(persons.id, id));
}

// ----------------------------------------------------------------------------
// Debts — lend deducts from wallet, borrow adds to wallet
// ----------------------------------------------------------------------------

export async function createDebt(input: {
  personId: number;
  walletId?: number | null; // null = tracking-only, does not move a wallet
  type: 'lend' | 'borrow';
  amount: number; // positive minor units
  note?: string;
  date?: number;
}) {
  const walletId = input.walletId ?? null;
  // lend = money leaves wallet; borrow = money enters wallet.
  const delta = input.type === 'lend' ? -input.amount : input.amount;
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
    });
    if (walletId !== null) {
      await tx
        .update(wallets)
        .set({ balance: sql`${wallets.balance} + ${delta}` })
        .where(eq(wallets.id, walletId));
    }
  });
}

/**
 * Record a repayment against a debt.
 * - lend (they repay you)  → wallet += amount, outstanding -= amount
 * - borrow (you repay them) → wallet -= amount, outstanding -= amount
 * Pays into the supplied wallet (defaults to the debt's wallet).
 */
export async function recordPayment(input: {
  debtId: number;
  amount: number;
  walletId?: number | null; // null = cash, does not move a wallet
  date?: number;
}) {
  await db.transaction(async (tx) => {
    const [debt] = await tx.select().from(debts).where(eq(debts.id, input.debtId));
    if (!debt) throw new Error('debt not found');

    const pay = Math.min(input.amount, debt.outstanding);
    // Explicit wallet wins; else fall back to the debt's wallet (may itself be null).
    const walletId = input.walletId !== undefined ? input.walletId : debt.walletId;
    const delta = debt.type === 'lend' ? pay : -pay;
    const newOutstanding = debt.outstanding - pay;

    await tx.insert(debtPayments).values({
      debtId: debt.id,
      walletId: walletId ?? null,
      amount: pay,
      date: input.date ?? now(),
      createdAt: now(),
    });
    if (walletId != null) {
      await tx
        .update(wallets)
        .set({ balance: sql`${wallets.balance} + ${delta}` })
        .where(eq(wallets.id, walletId));
    }
    await tx
      .update(debts)
      .set({ outstanding: newOutstanding, status: newOutstanding <= 0 ? 'settled' : 'open' })
      .where(eq(debts.id, debt.id));
  });
}

export async function deleteDebt(id: number) {
  await db.delete(debts).where(eq(debts.id, id));
}

/** Undo a repayment: restore outstanding, reverse the wallet move, reopen if needed. */
export async function deletePayment(paymentId: number) {
  await db.transaction(async (tx) => {
    const [pay] = await tx.select().from(debtPayments).where(eq(debtPayments.id, paymentId));
    if (!pay) return;
    const [debt] = await tx.select().from(debts).where(eq(debts.id, pay.debtId));
    if (debt) {
      const newOutstanding = debt.outstanding + pay.amount;
      if (pay.walletId != null) {
        // Reverse the original effect: lend added to wallet, borrow subtracted.
        const delta = debt.type === 'lend' ? -pay.amount : pay.amount;
        await tx
          .update(wallets)
          .set({ balance: sql`${wallets.balance} + ${delta}` })
          .where(eq(wallets.id, pay.walletId));
      }
      await tx
        .update(debts)
        .set({ outstanding: newOutstanding, status: newOutstanding > 0 ? 'open' : 'settled' })
        .where(eq(debts.id, debt.id));
    }
    await tx.delete(debtPayments).where(eq(debtPayments.id, paymentId));
  });
}

// ----------------------------------------------------------------------------
// Settings (key/value)
// ----------------------------------------------------------------------------

export async function getSetting(key: string): Promise<string | null> {
  const [row] = await db.select().from(settings).where(eq(settings.key, key));
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string) {
  await db
    .insert(settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: settings.key, set: { value } });
}

// ----------------------------------------------------------------------------
// Bulk reset
// ----------------------------------------------------------------------------

export type ResetSelection = {
  wallets?: boolean;
  people?: boolean;
  debts?: boolean;
  transactions?: boolean;
};

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
  const all = sql`1 = 1`;
  await db.transaction(async (tx) => {
    if (sel.wallets) await tx.delete(wallets).where(all);
    if (sel.people) await tx.delete(persons).where(all);
    if (sel.debts) await tx.delete(debts).where(all);
    if (sel.transactions) {
      await tx.delete(transactions).where(all);
      await tx.update(wallets).set({ balance: 0 });
    }
  });
}

export { and, eq, sql };
