/**
 * Parser for City Bank transaction SMS. Pure & side-effect free so it can be
 * unit-tested. Amounts are returned in minor units (poisha) — BDT * 100.
 *
 * Example messages:
 *   E-COMM/POS TXN \n Tk. 1,180 Purchased \n Tk. 6,661 Balance \n A/C: ...
 *   ATM TXN \n Tk. 3,015 Withdrawal \n Tk. 11,316 Balance
 *   CITYTOUCH TXN \n Tk. 8,053 Deposit \n Tk. 18,167 Balance
 */

export type ParsedSms = {
  type: 'income' | 'expense';
  amount: number; // minor units (BDT * 100); for bKash the fee is folded in
  balance?: number; // minor units, the bank's stated balance (informational)
  note?: string; // e.g. "ATM TXN"
};

const INCOME_WORDS = ['deposit', 'credit', 'received', 'refund'];
const EXPENSE_WORDS = ['purchased', 'withdrawal', 'payment', 'debit', 'spent', 'purchase'];

function toMinor(raw: string): number {
  return Math.round(Number(raw.replace(/,/g, '')) * 100);
}

export function parseCityBankSms(body: string): ParsedSms | null {
  const lower = body.toLowerCase();
  const type: ParsedSms['type'] | null = INCOME_WORDS.some((w) => lower.includes(w))
    ? 'income'
    : EXPENSE_WORDS.some((w) => lower.includes(w))
      ? 'expense'
      : null;
  if (!type) return null;

  // The transaction amount is the first "Tk. N" that is NOT the balance line.
  const balanceMatch = body.match(/Tk\.?\s*([\d,]+(?:\.\d+)?)\s*Balance/i);
  const balance = balanceMatch ? toMinor(balanceMatch[1]) : undefined;

  // City Bank prints the transaction amount first, the balance after it.
  const amounts = [...body.matchAll(/Tk\.?\s*([\d,]+(?:\.\d+)?)/gi)].map((m) => toMinor(m[1]));
  const amount = amounts[0];
  if (amount === undefined || amount <= 0) return null;

  // City Bank's second line is the transaction descriptor (e.g. "ATM TXN",
  // "E-COMM/POS TXN", "CITYTOUCH TXN") — use it as the note.
  const lines = body
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const note = lines[1];

  return { type, amount, balance, note };
}

/**
 * Parser for bKash transaction SMS. Handles the common message shapes:
 *   "You have received Tk 303.00 from ... Fee Tk 0.00. Balance Tk 713.57."
 *   "Bill successfully paid. ... Amount: Tk 1,000.00 Fee: Tk 10.00 ..."
 *   "Payment of Tk 200.00 to ... Fee Tk 1.66. Balance ..."
 *   "Cash In Tk 1,500.00 from ... Balance ..."
 *   "Cash Out Tk 2,500.00 to ... Fee Tk 46.25. Balance ..."
 *   "You have received remittance. Total: Tk 21,525.00 ..."
 * The transaction amount is always the first "Tk N"; Fee/Balance are labelled.
 */
const BKASH_INCOME = ['received', 'cash in', 'cashback', 'deposit', 'remittance', 'add money', 'refund'];
const BKASH_EXPENSE = ['payment of', 'cash out', 'bill', 'send money', 'sent', 'paid'];

export function parseBkashSms(body: string): ParsedSms | null {
  const lower = body.toLowerCase();
  const type: ParsedSms['type'] | null = BKASH_INCOME.some((w) => lower.includes(w))
    ? 'income'
    : BKASH_EXPENSE.some((w) => lower.includes(w))
      ? 'expense'
      : null;
  if (!type) return null;

  const amounts = [...body.matchAll(/Tk\.?\s*([\d,]+(?:\.\d+)?)/gi)].map((m) => toMinor(m[1]));
  const amount = amounts[0];
  if (amount === undefined || amount <= 0) return null;

  // Fee is ignored on bKash — the transaction amount already accounts for it.
  const balMatch = body.match(/Balance:?\s*Tk\.?\s*([\d,]+(?:\.\d+)?)/i);
  const balance = balMatch ? toMinor(balMatch[1]) : undefined;

  return { type, amount, balance };
}

/**
 * Parser for Standard Chartered BD SMS. Amounts are prefixed "BDT" and the
 * transaction amount always appears before the "Available credit/balance" line.
 * Examples:
 *   "BDT 1485.00 transaction was made on card ending 2054 at BEST BUY ... Available credit: BDT 61262.16"
 *   "BDT 575.00 have been paid at MR D I Y ... using VISA Debit Card ..."
 *   "BDT 602.84 has been debited from card ... pertaining to First Period Interest ..."
 *   "BDT 1,250.00 has been credited to card ... pertaining to MONEY BACK ..."
 *   "Your NPS transfer request to Md Shahriyar Alam amount BDT 3,300.00 has been processed ..."
 *   "BDT 33,000.00 was deposited to Acc. ending xxx3901. Available balance is now BDT 39,181.30"
 */
const SC_INCOME = ['credited', 'deposited', 'received', 'refund', 'money back'];
const SC_EXPENSE = ['transaction', 'paid', 'debited', 'transfer', 'withdrawn', 'purchase'];

export function parseStanChartSms(body: string): ParsedSms | null {
  const lower = body.toLowerCase();
  const type: ParsedSms['type'] | null = SC_INCOME.some((w) => lower.includes(w))
    ? 'income'
    : SC_EXPENSE.some((w) => lower.includes(w))
      ? 'expense'
      : null;
  if (!type) return null;

  const amounts = [...body.matchAll(/BDT\s*([\d,]+(?:\.\d+)?)/gi)].map((m) => toMinor(m[1]));
  const amount = amounts[0];
  if (amount === undefined || amount <= 0) return null;

  const balMatch = body.match(/Available\s+(?:credit|balance)(?:\s+is\s+now)?:?\s*BDT\s*([\d,]+(?:\.\d+)?)/i);
  const balance = balMatch ? toMinor(balMatch[1]) : undefined;

  // Best-effort note: merchant ("at X on/using"), reason ("pertaining to X."),
  // transfer recipient, or a deposit label.
  const at = body.match(/\bat\s+(.+?)\s+(?:on|using)\b/i);
  const pertaining = body.match(/pertaining to\s+(.+?)[.\n]/i);
  const transferTo = body.match(/transfer request to\s+(.+?)\s+amount/i);
  let note: string | undefined;
  if (at) note = at[1].trim();
  else if (pertaining) note = pertaining[1].trim();
  else if (transferTo) note = `Transfer to ${transferTo[1].trim()}`;
  else if (/deposited/i.test(body)) note = 'Deposit';

  return { type, amount, balance, note };
}
