import { eq } from 'drizzle-orm'
import { useLiveQuery } from 'drizzle-orm/expo-sqlite'
import { useEffect, useRef } from 'react'
import { PermissionsAndroid, Platform } from 'react-native'

import { db } from '@/db/client'
import { addTransaction, findWalletBySmsSender } from '@/db/repo'
import { settings } from '@/db/schema'
import { bankForSender } from '@/lib/banks'
import { addSmsListener, isSmsListenerAvailable } from '../../modules/sms-listener'

export const SMS_IMPORT_KEY = 'sms_import'

/**
 * Android-only: when the "sms_import" setting is on, listen for incoming bank
 * SMS, identify the bank by sender, and silently add a matching income/expense
 * to the wallet mapped to that bank (wallet.smsSender). Mounted once at root.
 */
export function SmsImporter() {
  const { data } = useLiveQuery(db.select().from(settings).where(eq(settings.key, SMS_IMPORT_KEY)))
  const enabled = data?.[0]?.value === '1'
  // Guard against duplicate broadcasts of the same message.
  const lastRef = useRef<string>('')

  useEffect(() => {
    if (Platform.OS !== 'android' || !enabled || !isSmsListenerAvailable) return

    let sub: { remove: () => void } | undefined
    let cancelled = false

    ;(async () => {
      const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECEIVE_SMS)
      if (cancelled || granted !== PermissionsAndroid.RESULTS.GRANTED) return

      sub = addSmsListener(({ sender, body }) => {
        const bank = bankForSender(sender)
        if (!bank) return // sender not a known bank

        const key = `${sender}|${body}`
        if (key === lastRef.current) return
        lastRef.current = key

        const parsed = bank.parse(body)
        if (!parsed) return

        ;(async () => {
          const wallet = await findWalletBySmsSender(bank.id)
          if (!wallet) return // no wallet mapped to this bank
          await addTransaction({
            walletId: wallet.id,
            type: parsed.type,
            amount: parsed.amount,
            category: 'other',
            note: parsed.note,
            smsBody: body,
          })
        })()
      })
    })()

    return () => {
      cancelled = true
      sub?.remove()
    }
  }, [enabled])

  return null
}
