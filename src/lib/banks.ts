import { type ParsedSms, parseBkashSms, parseCityBankSms, parseStanChartSms } from './sms-parser'

/** Banks whose SMS we can map to a wallet. Add a parser to enable auto-import. */
export type BankId = 'citybank' | 'stanchart' | 'bkash'

export type Bank = {
  id: BankId
  /** Human label shown in the wallet form picker. */
  label: string
  /** Normalized sender tokens (uppercase letters only) that identify this bank. */
  senderAliases: string[]
  /** Parse a message body into a transaction, or null if unsupported/unmatched. */
  parse: (body: string) => ParsedSms | null
  /** False while the parser is still a stub (selectable, but won't import yet). */
  supported: boolean
}

export const BANKS: Bank[] = [
  {
    id: 'citybank',
    label: 'CITY BANK',
    // Real sender "CITY BANK" normalizes to CITYBANK.
    senderAliases: ['CITYBANK'],
    parse: parseCityBankSms,
    supported: true,
  },
  {
    id: 'stanchart',
    label: 'StanChartBD',
    senderAliases: ['STANCHARTBD', 'STANDARDCHARTERED', 'SCBANK', 'SCB'],
    parse: parseStanChartSms,
    supported: true,
  },
  {
    id: 'bkash',
    label: 'bKash',
    senderAliases: ['BKASH'],
    parse: parseBkashSms,
    supported: true,
  },
]

export function normalizeSender(sender: string): string {
  return sender.toUpperCase().replace(/[^A-Z]/g, '')
}

/** Find the bank a raw SMS sender belongs to, or null. */
export function bankForSender(sender: string): Bank | null {
  const n = normalizeSender(sender)
  return BANKS.find((b) => b.senderAliases.some((a) => n.includes(a))) ?? null
}

export function bankById(id: string | null | undefined): Bank | null {
  return BANKS.find((b) => b.id === id) ?? null
}
