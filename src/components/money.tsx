import { ThemedText, type ThemedTextProps } from '@/components/themed-text'
import { useCurrency } from '@/hooks/use-currency'
import { formatAmount, formatMoney } from '@/lib/format'

type Props = ThemedTextProps & {
  value: number // minor units
  /** Color positive/negative with semantic tokens. */
  signed?: boolean
  showPlus?: boolean
  /** Render the number only, without the currency symbol/code. */
  plain?: boolean
}

export function Money({ value, signed, showPlus, plain, themeColor, ...rest }: Props) {
  const currency = useCurrency()
  const color = signed ? (value < 0 ? 'negative' : 'positive') : themeColor
  const prefix = showPlus && value > 0 ? '+' : ''
  return (
    <ThemedText themeColor={color} {...rest}>
      {prefix}
      {plain ? formatAmount(value) : formatMoney(value, currency)}
    </ThemedText>
  )
}
