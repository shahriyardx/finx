/** Format integer minor units (cents) as a currency string. */
export function formatMoney(minor: number, currency = 'BDT'): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(minor / 100)
  } catch {
    // Unknown currency code → fall back to plain number with the code.
    return `${(minor / 100).toFixed(2)} ${currency}`
  }
}

/** Format minor units as a grouped decimal number with no currency symbol. */
export function formatAmount(minor: number): string {
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(minor / 100)
}

/** Parse a user-entered decimal string into integer minor units. */
export function parseMoney(input: string): number {
  const n = Number(input.replace(/[^0-9.]/g, ''))
  if (!Number.isFinite(n)) return 0
  return Math.round(n * 100)
}

export function formatDate(epochMs: number): string {
  return new Date(epochMs).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export const CURRENCIES = ['BDT', 'USD', 'EUR', 'GBP', 'PKR', 'INR', 'AED', 'TRY', 'JPY'] as const
