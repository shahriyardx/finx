import type MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import type { ComponentProps } from 'react'

export type WalletIconName = ComponentProps<typeof MaterialCommunityIcons>['name']

export type Category = { key: string; label: string; icon: WalletIconName }

export const EXPENSE_CATEGORIES: Category[] = [
  { key: 'food', label: 'Food', icon: 'silverware-fork-knife' },
  { key: 'transport', label: 'Transport', icon: 'car' },
  { key: 'gas', label: 'Gas', icon: 'gas-station' },
  { key: 'shopping', label: 'Shopping', icon: 'shopping' },
  { key: 'bills', label: 'Bills', icon: 'file-document' },
  { key: 'health', label: 'Health', icon: 'heart-pulse' },
  { key: 'fun', label: 'Fun', icon: 'gamepad-variant' },
  { key: 'other', label: 'Other', icon: 'dots-horizontal-circle' },
]

export const INCOME_CATEGORIES: Category[] = [
  { key: 'salary', label: 'Salary', icon: 'cash' },
  { key: 'gift', label: 'Gift', icon: 'gift' },
  { key: 'business', label: 'Business', icon: 'briefcase' },
  { key: 'other', label: 'Other', icon: 'dots-horizontal-circle' },
]

export function categoryLabel(key: string): string {
  const all = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES]
  return all.find((c) => c.key === key)?.label ?? key
}

export const WALLET_COLORS = [
  '#10B981', // emerald
  '#9FE870', // lime
  '#14B8A6', // teal
  '#3B82F6', // blue
  '#6366F1', // indigo
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#EF4444', // red
  '#F97316', // orange
  '#F59E0B', // amber
]

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
]
