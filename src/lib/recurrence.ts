export type Frequency = 'daily' | 'weekly' | 'monthly' | 'yearly'

/** Which day a schedule lands on. Only the field for the chosen frequency matters. */
export type Anchor = {
  weekday?: number | null // 0=Sun … 6=Sat (weekly)
  dayOfMonth?: number | null // 1…31 (monthly + yearly)
  month?: number | null // 0=Jan … 11=Dec (yearly)
}

export const FREQUENCIES: { key: Frequency; label: string; unit: string }[] = [
  { key: 'daily', label: 'Daily', unit: 'day' },
  { key: 'weekly', label: 'Weekly', unit: 'week' },
  { key: 'monthly', label: 'Monthly', unit: 'month' },
  { key: 'yearly', label: 'Yearly', unit: 'year' },
]

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function lastDayOfMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate()
}

/** Build a local-midnight Date for the given y/m/day, clamping day to month length. */
function dayDate(year: number, monthIndex: number, day: number): Date {
  return new Date(year, monthIndex, Math.min(day, lastDayOfMonth(year, monthIndex)))
}

/**
 * First time this schedule should fire on or after `fromMs`. Lands on local
 * midnight of the matching day so the runner posts it that day.
 */
export function firstOccurrence(fromMs: number, freq: Frequency, anchor: Anchor): number {
  const base = new Date(fromMs)
  base.setHours(0, 0, 0, 0)

  switch (freq) {
    case 'daily':
      return base.getTime()
    case 'weekly': {
      const w = anchor.weekday ?? base.getDay()
      const delta = (w - base.getDay() + 7) % 7
      base.setDate(base.getDate() + delta)
      return base.getTime()
    }
    case 'monthly': {
      const dom = anchor.dayOfMonth ?? base.getDate()
      let d = dayDate(base.getFullYear(), base.getMonth(), dom)
      if (d.getTime() < base.getTime()) d = dayDate(base.getFullYear(), base.getMonth() + 1, dom)
      return d.getTime()
    }
    default: {
      const mo = anchor.month ?? base.getMonth()
      const dom = anchor.dayOfMonth ?? base.getDate()
      let d = dayDate(base.getFullYear(), mo, dom)
      if (d.getTime() < base.getTime()) d = dayDate(base.getFullYear() + 1, mo, dom)
      return d.getTime()
    }
  }
}

/**
 * Next fire time after `fromMs`, `interval` periods later. Re-derives the day
 * from the anchor each step so a "31st" rule stays the 31st (clamped in short
 * months) instead of drifting after a clamp.
 */
export function advance(fromMs: number, freq: Frequency, interval: number, anchor: Anchor): number {
  const n = Math.max(1, interval)
  const d = new Date(fromMs)

  switch (freq) {
    case 'daily':
      d.setDate(d.getDate() + n)
      return d.getTime()
    case 'weekly':
      d.setDate(d.getDate() + 7 * n)
      return d.getTime()
    case 'monthly': {
      const dom = anchor.dayOfMonth ?? d.getDate()
      const target = d.getMonth() + n
      const year = d.getFullYear() + Math.floor(target / 12)
      const monthIndex = ((target % 12) + 12) % 12
      return dayDate(year, monthIndex, dom).getTime()
    }
    default: {
      const mo = anchor.month ?? d.getMonth()
      const dom = anchor.dayOfMonth ?? d.getDate()
      return dayDate(d.getFullYear() + n, mo, dom).getTime()
    }
  }
}

/** Human label, e.g. "Monthly · day 15" or "Every 2 weeks · Sun". */
export function scheduleLabel(freq: Frequency, interval = 1, anchor?: Anchor): string {
  const f = FREQUENCIES.find((x) => x.key === freq)
  const base = !f ? freq : interval <= 1 ? f.label : `Every ${interval} ${f.unit}s`

  if (freq === 'weekly' && anchor?.weekday != null) return `${base} · ${WEEKDAYS[anchor.weekday]}`
  if (freq === 'monthly' && anchor?.dayOfMonth != null) return `${base} · day ${anchor.dayOfMonth}`
  if (freq === 'yearly' && anchor?.month != null) {
    return `${base} · ${MONTHS[anchor.month]} ${anchor.dayOfMonth ?? ''}`.trim()
  }
  return base
}
