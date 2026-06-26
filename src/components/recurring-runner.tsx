import { useEffect, useRef } from 'react'
import { AppState, type AppStateStatus } from 'react-native'

import { runDueRecurring } from '@/db/repo'

/**
 * Posts any due recurring transactions on mount and whenever the app returns to
 * the foreground (catch-up after it was backgrounded/closed). Mounted once at root.
 */
export function RecurringRunner() {
  const running = useRef(false)

  useEffect(() => {
    const run = () => {
      if (running.current) return
      running.current = true
      runDueRecurring().finally(() => {
        running.current = false
      })
    }

    run()
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') run()
    })
    return () => sub.remove()
  }, [])

  return null
}
