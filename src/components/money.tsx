import { ThemedText, type ThemedTextProps } from '@/components/themed-text';
import { useCurrency } from '@/hooks/use-currency';
import { formatMoney } from '@/lib/format';

type Props = ThemedTextProps & {
  value: number; // minor units
  /** Color positive/negative with semantic tokens. */
  signed?: boolean;
  showPlus?: boolean;
};

export function Money({ value, signed, showPlus, themeColor, ...rest }: Props) {
  const currency = useCurrency();
  const color = signed ? (value < 0 ? 'negative' : 'positive') : themeColor;
  const prefix = showPlus && value > 0 ? '+' : '';
  return (
    <ThemedText themeColor={color} {...rest}>
      {prefix}
      {formatMoney(value, currency)}
    </ThemedText>
  );
}
