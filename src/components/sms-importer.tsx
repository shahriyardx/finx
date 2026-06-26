import { eq } from 'drizzle-orm'
import { useLiveQuery } from 'drizzle-orm/expo-sqlite'
import { useEffect } from 'react'
import { PermissionsAndroid, Platform } from 'react-native'

import { db } from '@/db/client'
import { settings } from '@/db/schema'
import { ensureNotificationPermission, setupNotifications } from '@/lib/notifications'
import { SMS_IMPORT_KEY } from '@/lib/sms-import'

export { SMS_IMPORT_KEY } from '@/lib/sms-import'

/**
 * Android-only: when "auto-import bank SMS" is on, ensure the SMS + notification
 * permissions are granted and the notification category is set up. The actual
 * import runs in a manifest-declared headless task (see modules/sms-listener +
 * src/lib/sms-import), so it works even when the app has been swiped away.
 */
export function SmsImporter() {
  const { data } = useLiveQuery(db.select().from(settings).where(eq(settings.key, SMS_IMPORT_KEY)))
  const enabled = data?.[0]?.value === '1'

  useEffect(() => {
    if (Platform.OS !== 'android' || !enabled) return
    let cancelled = false
    ;(async () => {
      const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECEIVE_SMS)
      if (cancelled || granted !== PermissionsAndroid.RESULTS.GRANTED) return
      await setupNotifications()
      await ensureNotificationPermission()
    })()
    return () => {
      cancelled = true
    }
  }, [enabled])

  return null
}
