import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { Pressable, StyleSheet, View } from 'react-native'

import { Money } from '@/components/money'
import { ThemedText } from '@/components/themed-text'
import { Spacing } from '@/constants/theme'
import { useTheme } from '@/hooks/use-theme'
import { categoryLabel, EXPENSE_CATEGORIES, INCOME_CATEGORIES, type WalletIconName } from '@/lib/categories'
import { formatDate } from '@/lib/format'

type Props = {
  type: 'income' | 'expense'
  amount: number
  category: string
  note?: string | null
  date: number
  subtitle?: string
  hasReceipt?: boolean
  onPress?: () => void
}

function iconFor(type: 'income' | 'expense', category: string): WalletIconName {
  const list = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
  return list.find((c) => c.key === category)?.icon ?? 'dots-horizontal-circle'
}

export function TransactionRow({ type, amount, category, note, date, subtitle, hasReceipt, onPress }: Props) {
  const theme = useTheme()
  const signed = type === 'income' ? amount : -amount
  const color = type === 'income' ? theme.income : theme.expense
  const Wrapper = onPress ? Pressable : View
  return (
    <Wrapper style={styles.row} onPress={onPress}>
      <View style={[styles.badge, { backgroundColor: color }]}>
        <MaterialCommunityIcons name={iconFor(type, category)} size={20} color="#ffffff" />
      </View>
      <View style={styles.middle}>
        <View style={styles.titleRow}>
          <ThemedText type="default" numberOfLines={1} style={styles.title}>
            {note?.trim() || categoryLabel(category)}
          </ThemedText>
          {hasReceipt ? <MaterialCommunityIcons name="paperclip" size={14} color={theme.textSecondary} /> : null}
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          {subtitle ?? formatDate(date)}
        </ThemedText>
      </View>
      <Money value={signed} signed showPlus type="smallBold" />
    </Wrapper>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.two },
  badge: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  middle: { flex: 1, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  title: { flexShrink: 1 },
})
