import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * All monetary amounts are stored as integer minor units (cents) to avoid
 * floating-point drift. Timestamps are epoch milliseconds.
 */

export const wallets = sqliteTable('wallets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  balance: integer('balance').notNull().default(0),
  color: text('color').notNull().default('#10B981'),
  icon: text('icon').notNull().default('wallet'),
  // Optional bank-SMS sender mapped to this wallet (bank id from lib/banks).
  smsSender: text('sms_sender'),
  createdAt: integer('created_at')
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export const transactions = sqliteTable('transactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  walletId: integer('wallet_id')
    .notNull()
    .references(() => wallets.id, { onDelete: 'cascade' }),
  type: text('type', { enum: ['income', 'expense'] }).notNull(),
  amount: integer('amount').notNull(),
  category: text('category').notNull().default('other'),
  note: text('note'),
  receipt: text('receipt'), // local file uri of an attached receipt photo, optional
  date: integer('date').notNull(),
  createdAt: integer('created_at')
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

/** Money moved between two wallets. Kept out of the income/expense ledger. */
export const transfers = sqliteTable('transfers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  fromWalletId: integer('from_wallet_id')
    .notNull()
    .references(() => wallets.id, { onDelete: 'cascade' }),
  toWalletId: integer('to_wallet_id')
    .notNull()
    .references(() => wallets.id, { onDelete: 'cascade' }),
  amount: integer('amount').notNull(),
  note: text('note'),
  date: integer('date').notNull(),
  createdAt: integer('created_at')
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export const persons = sqliteTable('persons', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  phone: text('phone'),
  note: text('note'),
  avatar: text('avatar'), // local file uri, optional
  createdAt: integer('created_at')
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export const debts = sqliteTable('debts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  personId: integer('person_id')
    .notNull()
    .references(() => persons.id, { onDelete: 'cascade' }),
  // Optional: when null the debt is tracking-only and does not move any wallet.
  walletId: integer('wallet_id').references(() => wallets.id, { onDelete: 'set null' }),
  // 'lend' = you gave money out; 'borrow' = you took money in.
  type: text('type', { enum: ['lend', 'borrow'] }).notNull(),
  principal: integer('principal').notNull(),
  outstanding: integer('outstanding').notNull(),
  note: text('note'),
  date: integer('date').notNull(),
  status: text('status', { enum: ['open', 'settled'] })
    .notNull()
    .default('open'),
  createdAt: integer('created_at')
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export const debtPayments = sqliteTable('debt_payments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  debtId: integer('debt_id')
    .notNull()
    .references(() => debts.id, { onDelete: 'cascade' }),
  // Optional: a payment may be cash-only and not touch a tracked wallet.
  walletId: integer('wallet_id').references(() => wallets.id, { onDelete: 'set null' }),
  amount: integer('amount').notNull(),
  date: integer('date').notNull(),
  createdAt: integer('created_at')
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

export type Wallet = typeof wallets.$inferSelect;
export type NewWallet = typeof wallets.$inferInsert;
export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
export type Person = typeof persons.$inferSelect;
export type NewPerson = typeof persons.$inferInsert;
export type Debt = typeof debts.$inferSelect;
export type NewDebt = typeof debts.$inferInsert;
export type DebtPayment = typeof debtPayments.$inferSelect;
export type Transfer = typeof transfers.$inferSelect;
export type NewTransfer = typeof transfers.$inferInsert;
