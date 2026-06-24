import type MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';

export type Category = { key: string; label: string; symbol: string };

export const EXPENSE_CATEGORIES: Category[] = [
  { key: 'food', label: 'Food', symbol: 'fork.knife' },
  { key: 'transport', label: 'Transport', symbol: 'car.fill' },
  { key: 'shopping', label: 'Shopping', symbol: 'bag.fill' },
  { key: 'bills', label: 'Bills', symbol: 'doc.text.fill' },
  { key: 'health', label: 'Health', symbol: 'heart.fill' },
  { key: 'fun', label: 'Fun', symbol: 'gamecontroller.fill' },
  { key: 'other', label: 'Other', symbol: 'square.grid.2x2.fill' },
];

export const INCOME_CATEGORIES: Category[] = [
  { key: 'salary', label: 'Salary', symbol: 'banknote.fill' },
  { key: 'gift', label: 'Gift', symbol: 'gift.fill' },
  { key: 'business', label: 'Business', symbol: 'briefcase.fill' },
  { key: 'other', label: 'Other', symbol: 'square.grid.2x2.fill' },
];

export function categoryLabel(key: string): string {
  const all = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];
  return all.find((c) => c.key === key)?.label ?? key;
}

export const WALLET_COLORS = ['#10B981', '#9FE870', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6'];

export type WalletIconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

/** MaterialCommunityIcons (vector) names — wallet-related, cross-platform. */
export const WALLET_ICONS: WalletIconName[] = [
  'wallet',
  'credit-card',
  'bank',
  'cash',
  'cash-multiple',
  'piggy-bank',
  'safe',
  'currency-usd',
  'bitcoin',
  'wallet-travel',
  'hand-coin',
  'chart-line',
];
