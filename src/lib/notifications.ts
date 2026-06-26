import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'

import { formatMoney } from './format'

/** Category whose two action buttons appear on auto-imported SMS transactions. */
export const SMS_TX_CATEGORY = 'sms_tx'
export const ACTION_UNDO = 'undo'
export const ACTION_VIEW = 'view'

let configured = false

/**
 * One-time setup: show banners while foregrounded, register the Undo/View
 * action category, and (Android) create the default channel. Safe to call
 * repeatedly — work runs once.
 */
export async function setupNotifications(): Promise<void> {
  if (configured) return
  configured = true

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  })

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Transactions',
      importance: Notifications.AndroidImportance.DEFAULT,
    })
  }

  await Notifications.setNotificationCategoryAsync(SMS_TX_CATEGORY, [
    // View opens the app to the transaction; Undo deletes without leaving the
    // notification shade (only runs while JS is alive — a killed app opens first).
    { identifier: ACTION_VIEW, buttonTitle: 'View', options: { opensAppToForeground: true } },
    { identifier: ACTION_UNDO, buttonTitle: 'Undo', options: { opensAppToForeground: false, isDestructive: true } },
  ])
}

/** Ask for notification permission once; returns whether it's granted. */
export async function ensureNotificationPermission(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync()
  if (status === 'granted') return true
  const req = await Notifications.requestPermissionsAsync()
  return req.status === 'granted'
}

/** Post the "transaction added from SMS" notification with Undo + View actions. */
export async function notifyTxImported(input: {
  txId: number
  type: 'income' | 'expense'
  amount: number
  walletName: string
  note?: string
  currency?: string
}): Promise<void> {
  const sign = input.type === 'income' ? '+' : '−'
  const title = `${sign}${formatMoney(input.amount, input.currency)} · ${input.walletName}`
  const body = input.note?.trim() || (input.type === 'income' ? 'Money received' : 'Payment')
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: { txId: input.txId },
      categoryIdentifier: SMS_TX_CATEGORY,
    },
    trigger: null,
  })
}
