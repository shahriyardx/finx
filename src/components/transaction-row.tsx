import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { StyleSheet, View } from 'react-native';

import { Money } from '@/components/money';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  categoryLabel,
  type WalletIconName,
} from '@/lib/categories';
import { formatDate } from '@/lib/format';

type Props = {
  type: 'income' | 'expense';
  amount: number;
  category: string;
  note?: string | null;
  date: number;
  subtitle?: string;
};

function iconFor(type: 'income' | 'expense', category: string): WalletIconName {
  const list = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  return list.find((c) => c.key === category)?.icon ?? 'dots-horizontal-circle';
}

export function TransactionRow({ type, amount, category, note, date, subtitle }: Props) {
  const theme = useTheme();
  const signed = type === 'income' ? amount : -amount;
  const color = type === 'income' ? theme.income : theme.expense;
  return (
    <View style={styles.row}>
      <View style={[styles.badge, { backgroundColor: color }]}>
        <MaterialCommunityIcons name={iconFor(type, category)} size={20} color="#ffffff" />
      </View>
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
  badge: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  middle: { flex: 1, gap: 2 },
});
