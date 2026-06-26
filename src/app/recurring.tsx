import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { useLiveQuery } from 'drizzle-orm/expo-sqlite'
import { useRouter } from 'expo-router'
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native'

import { useConfirm } from '@/components/confirm-dialog'
import { ThemedText } from '@/components/themed-text'
import { ThemedView } from '@/components/themed-view'
import { Button } from '@/components/ui/button'
import { Spacing } from '@/constants/theme'
import { db } from '@/db/client'
import { deleteRecurring, setRecurringActive } from '@/db/repo'
import { recurring, wallets } from '@/db/schema'
import { useCurrency } from '@/hooks/use-currency'
import { useTheme } from '@/hooks/use-theme'
import { categoryLabel } from '@/lib/categories'
import { formatDate, formatMoney } from '@/lib/format'
import { scheduleLabel } from '@/lib/recurrence'

export default function RecurringScreen() {
  const theme = useTheme()
  const router = useRouter()
  const confirm = useConfirm()
  const currency = useCurrency()

  const { data: rules } = useLiveQuery(db.select().from(recurring))
  const { data: walletRows } = useLiveQuery(db.select().from(wallets))
  const walletName = (id: number) => walletRows?.find((w) => w.id === id)?.name ?? 'Wallet'
  const list = rules ?? []

  const remove = async (id: number) => {
    const ok = await confirm({
      title: 'Delete recurring?',
      message: 'Stops future auto-posts. Already-posted transactions are kept.',
      confirmLabel: 'Delete',
    })
    if (ok) await deleteRecurring(id)
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <ThemedText type="small" themeColor="textSecondary">
          Rules that automatically post a transaction on a schedule.
        </ThemedText>

        {list.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
            No recurring transactions yet.
          </ThemedText>
        ) : (
          list.map((r) => {
            const color = r.type === 'income' ? theme.income : theme.expense
            const sign = r.type === 'income' ? '+' : '−'
            return (
              <ThemedView key={r.id} type="backgroundElement" style={[styles.card, !r.active && styles.dim]}>
                <Pressable style={styles.row} onPress={() => router.push(`/modals/recurring-form?id=${r.id}`)}>
                  <View style={styles.flex}>
                    <ThemedText type="default" numberOfLines={1}>
                      {r.note?.trim() || categoryLabel(r.category)}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {scheduleLabel(r.frequency, r.interval, {
                        weekday: r.weekday,
                        dayOfMonth: r.dayOfMonth,
                        month: r.month,
                      })}{' '}
                      · {walletName(r.walletId)}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {r.active ? `Next: ${formatDate(r.nextRun)}` : 'Paused'}
                    </ThemedText>
                  </View>
                  <ThemedText type="default" style={{ color, fontWeight: '700' }}>
                    {sign}
                    {formatMoney(r.amount, currency)}
                  </ThemedText>
                </Pressable>
                <View style={styles.actions}>
                  <Switch
                    value={!!r.active}
                    onValueChange={(on) => setRecurringActive(r.id, on)}
                    trackColor={{ true: theme.accent }}
                  />
                  <Pressable onPress={() => remove(r.id)} hitSlop={8} style={styles.delete}>
                    <MaterialCommunityIcons name="trash-can-outline" size={18} color={theme.expense} />
                    <ThemedText type="small" style={{ color: theme.expense, fontWeight: '600' }}>
                      Delete
                    </ThemedText>
                  </Pressable>
                </View>
              </ThemedView>
            )
          })
        )}

        <Button
          variant="primary"
          label="New recurring"
          style={{ marginTop: Spacing.two }}
          onPress={() => router.push('/modals/recurring-form')}
        />
      </ScrollView>
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.two, paddingBottom: Spacing.six },
  card: { borderRadius: Spacing.three, padding: Spacing.three, gap: Spacing.two },
  dim: { opacity: 0.6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  flex: { flex: 1, gap: 2 },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  delete: { flexDirection: 'row', alignItems: 'center', gap: Spacing.half },
  empty: { textAlign: 'center', paddingVertical: Spacing.four },
})
