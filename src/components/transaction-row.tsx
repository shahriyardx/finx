import { StyleSheet, View } from 'react-native';

import { Money } from '@/components/money';
import { SymbolBadge } from '@/components/symbol-badge';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, categoryLabel } from '@/lib/categories';
import { formatDate } from '@/lib/format';

type Props = {
  type: 'income' | 'expense';
  amount: number;
  category: string;
  note?: string | null;
  date: number;
  subtitle?: string;
};

function symbolFor(type: 'income' | 'expense', category: string) {
  const list = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  return list.find((c) => c.key === category)?.symbol ?? 'square.grid.2x2.fill';
}

export function TransactionRow({ type, amount, category, note, date, subtitle }: Props) {
  const theme = useTheme();
  const signed = type === 'income' ? amount : -amount;
  return (
    <View style={styles.row}>
      <SymbolBadge
        symbol={symbolFor(type, category) as never}
        fallback={categoryLabel(category).charAt(0)}
        color={type === 'income' ? theme.income : theme.expense}
      />
      <View style={styles.middle}>
        <ThemedText type="default" numberOfLines={1}>
          {note?.trim() || categoryLabel(category)}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {subtitle ?? formatDate(date)}
        </ThemedText>
      </View>
      <Money value={signed} signed showPlus type="smallBold" />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.two },
  middle: { flex: 1, gap: 2 },
});
