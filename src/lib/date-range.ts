export type Gran = 'week' | 'month' | 'year' | 'all'

export const GRANS: { key: Gran; label: string }[] = [
  { key: 'week', label: 'This week' },
  { key: 'month', label: 'This month' },
  { key: 'year', label: 'This year' },
  { key: 'all', label: 'All time' },
]

const MS_DAY = 86400000

/** Inclusive start, exclusive end (epoch ms) for the period containing `anchor`. */
export function bounds(gran: Gran, anchor: Date): { start: number; end: number } {
  const y = anchor.getFullYear()
  const m = anchor.getMonth()
  const d = anchor.getDate()
  const ms = (date: Date) => date.getTime()

  switch (gran) {
    case 'week': {
      const offset = (anchor.getDay() + 6) % 7 // days since Monday
      const start = new Date(y, m, d - offset)
      return { start: ms(start), end: ms(start) + 7 * MS_DAY }
    }
    case 'month':
      return { start: ms(new Date(y, m, 1)), end: ms(new Date(y, m + 1, 1)) }
    case 'year':
      return { start: ms(new Date(y, 0, 1)), end: ms(new Date(y + 1, 0, 1)) }
    case 'all':
    default:
      return { start: 0, end: Number.MAX_SAFE_INTEGER }
  }
}

/** Move the anchor one period in `dir` (+1 next, -1 prev). */
export function shiftAnchor(gran: Gran, anchor: Date, dir: 1 | -1): Date {
  const y = anchor.getFullYear()
  const m = anchor.getMonth()
  switch (gran) {
    case 'week':
      return new Date(anchor.getTime() + dir * 7 * MS_DAY)
    case 'month':
      return new Date(y, m + dir, 1)
    case 'year':
      return new Date(y + dir, 0, 1)
    case 'all':
    default:
      return anchor
  }
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export const MONTHS_FULL = MONTHS

export function periodLabel(gran: Gran, anchor: Date): string {
  const { start, end } = bounds(gran, anchor)
  switch (gran) {
    case 'week': {
      const s = new Date(start)
      const e = new Date(end - MS_DAY)
      return `${MONTHS[s.getMonth()]} ${s.getDate()} – ${MONTHS[e.getMonth()]} ${e.getDate()}`
    }
    case 'month':
      return `${MONTHS[anchor.getMonth()]} ${anchor.getFullYear()}`
    case 'year':
      return `${anchor.getFullYear()}`
    case 'all':
    default:
      return 'All time'
  }
}
