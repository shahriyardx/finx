import * as Notifications from 'expo-notifications'
import { useRouter } from 'expo-router'
import { useEffect, useRef } from 'react'

import { deleteTransaction } from '@/db/repo'
import { ACTION_UNDO, ACTION_VIEW } from '@/lib/notifications'

/**
 * Handles taps on the SMS-import notification's action buttons. Mounted once at
 * root. `Undo` deletes the transaction; `View` (and a plain tap) opens its
 * detail screen. Also drains the cold-start response so a kill-then-tap works.
 */
export function NotificationRouter() {
  const router = useRouter()
  // Guard so the cold-start response isn't re-handled by the live listener.
  const handledColdStart = useRef(false)

  useEffect(() => {
    async function handle(response: Notifications.NotificationResponse) {
      const txId = response.notification.request.content.data?.txId
      if (typeof txId !== 'number') return
      const identifier = response.notification.request.identifier

      if (response.actionIdentifier === ACTION_UNDO) {
        await deleteTransaction(txId)
        await Notifications.dismissNotificationAsync(identifier)
        return
      }
      // View button or a plain tap → open the transaction.
      if (
        response.actionIdentifier === ACTION_VIEW ||
        response.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER
      ) {
        await Notifications.dismissNotificationAsync(identifier)
        router.push(`/transaction/${txId}`)
      }
    }

    ;(async () => {
      const last = await Notifications.getLastNotificationResponseAsync()
      if (last && !handledColdStart.current) {
        handledColdStart.current = true
        await handle(last)
      }
    })()

    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      handledColdStart.current = true
      handle(response)
    })
    return () => sub.remove()
  }, [router])

  return null
}
