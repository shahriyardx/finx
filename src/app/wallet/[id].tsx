import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { desc, eq, or } from 'drizzle-orm'
import { useLiveQuery } from 'drizzle-orm/expo-sqlite'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'

import { useConfirm } from '@/components/confirm-dialog'
import { Money } from '@/components/money'
import { PeriodPicker } from '@/components/period-picker'
import { ThemedText } from '@/components/themed-text'
import { ThemedView } from '@/components/themed-view'
import { TransactionRow } from '@/components/transaction-row'
import { TransferRow } from '@/components/transfer-row'
import { Spacing } from '@/constants/theme'
import { db } from '@/db/client'
import { deleteWallet } from '@/db/repo'
import { transactions, transfers, wallets } from '@/db/schema'
import { useTheme } from '@/hooks/use-theme'
import { bounds, type Gran, periodLabel } from '@/lib/date-range'

export default function WalletDetail() {
  const theme = useTheme()
  const router = useRouter()
  const confirm = useConfirm()
  const { id } = useLocalSearchParams<{ id: string }>()
  const walletId = Number(id)

  const { data: walletRows } = useLiveQuery(db.select().from(wallets).where(eq(wallets.id, walletId)), [walletId])
  const { data: txns } = useLiveQuery(
    db.select().from(transactions).where(eq(transactions.walletId, walletId)).orderBy(desc(transactions.date)),
    [walletId],
  )
  const { data: xfers } = useLiveQuery(
    db
      .select()
      .from(transfers)
      .where(or(eq(transfers.fromWalletId, walletId), eq(transfers.toWalletId, walletId)))
      .orderBy(desc(transfers.date)),
    [walletId],
  )
  const { data: allWallets } = useLiveQuery(db.select().from(wallets))
  const wallet = walletRows?.[0]

  const now = useMemo(() => new Date(), [])
  const [gran, setGran] = useState<Gran>('month')
  const [anchor, setAnchor] = useState<Date>(now)
  const [pickerOpen, setPickerOpen] = useState(false)

  // Merge transactions + transfers into one date-sorted ledger for this wallet.
  const ledger = useMemo(() => {
    const names = new Map((allWallets ?? []).map((w) => [w.id, w.name]))
    const items: (
      | { kind: 'tx'; id: number; date: number; row: typeof transactions.$inferSelect }
      | {
          kind: 'xfer'
          id: number
          date: number
          direction: 'in' | 'out'
          otherName: string
          amount: number
          note: string | null
        }
    )[] = []
    for (const t of txns ?? []) items.push({ kind: 'tx', id: t.id, date: t.date, row: t })
    for (const x of xfers ?? []) {
      const direction = x.toWalletId === walletId ? 'in' : 'out'
      const otherId = direction === 'in' ? x.fromWalletId : x.toWalletId
      items.push({
        kind: 'xfer',
        id: x.id,
        date: x.date,
        direction,
        otherName: names.get(otherId) ?? 'Wallet',
        amount: x.amount,
        note: x.note,
      })
    }
    return items.sort((a, b) => b.date - a.date)
  }, [txns, xfers, allWallets, walletId])

  const periodLedger = useMemo(() => {
    const { start, end } = bounds(gran, anchor)
    return ledger.filter((i) => i.date >= start && i.date < end)
  }, [ledger, gran, anchor])

  const confirmDelete = async () => {
    if (await confirm({ title: 'Delete wallet', message: 'This also removes its transactions and transfers.' })) {
      await deleteWallet(walletId)
      router.back()
    }
  }

  if (!wallet) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={styles.empty}>Wallet not found.</ThemedText>
      </ThemedView>
    )
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          title: wallet.name,
          headerRight: () => (
            <Pressable onPress={() => router.push(`/modals/wallet-form?id=${walletId}`)} hitSlop={10}>
              <MaterialCommunityIcons name="pencil" size={22} color={theme.accent} />
            </Pressable>
          ),
        }}
      />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={[styles.hero, { backgroundColor: theme.hero }]}>
          <ThemedText type="small" style={{ color: theme.heroAccent }}>
            Balance
          </ThemedText>
          <Money value={wallet.balance} themeColor="heroText" style={styles.heroAmount} />

          <View style={styles.actions}>
            <Pressable
              onPress={() => router.push(`/modals/transfer-form?fromWalletId=${walletId}`)}
              style={[styles.action, styles.actionAlt]}>
              <MaterialCommunityIcons name="swap-horizontal" size={18} color={theme.heroText} />
              <ThemedText style={{ color: theme.heroText, fontWeight: '700' }}>Transfer</ThemedText>
            </Pressable>
            <Pressable
              onPress={() => router.push(`/modals/recurring-form?walletId=${walletId}`)}
              style={[styles.action, styles.actionAlt]}>
              <MaterialCommunityIcons name="calendar-sync" size={18} color={theme.heroText} />
              <ThemedText style={{ color: theme.heroText, fontWeight: '700' }}>Recurring</ThemedText>
            </Pressable>
          </View>
        </View>

        <View style={styles.sectionHead}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Activity
          </ThemedText>
          <Pressable onPress={() => setPickerOpen(true)} style={styles.period} hitSlop={8}>
            <ThemedText type="default" style={{ fontWeight: '700' }}>
              {periodLabel(gran, anchor)}
            </ThemedText>
            <MaterialCommunityIcons name="menu-down" size={18} color={theme.textSecondary} />
          </Pressable>
        </View>
        {periodLedger.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
            No activity in this period.
          </ThemedText>
        ) : (
          <ThemedView type="backgroundElement" style={styles.card}>
            {periodLedger.map((item) =>
              item.kind === 'tx' ? (
                <TransactionRow
                  key={`tx-${item.id}`}
                  type={item.row.type}
                  amount={item.row.amount}
                  category={item.row.category}
                  note={item.row.note}
                  date={item.row.date}
                  hasReceipt={!!item.row.receipt}
                  onPress={() => router.push(`/transaction/${item.id}`)}
                />
              ) : (
                <TransferRow
                  key={`xfer-${item.id}`}
                  direction={item.direction}
                  amount={item.amount}
                  otherName={item.otherName}
                  note={item.note}
                  date={item.date}
                />
              ),
            )}
          </ThemedView>
        )}

        <Pressable onPress={confirmDelete} style={styles.deleteBtn} hitSlop={8}>
          <ThemedText type="small" style={{ color: theme.expense, fontWeight: '600' }}>
            Delete wallet
          </ThemedText>
        </Pressable>
      </ScrollView>

      <PeriodPicker
        visible={pickerOpen}
        gran={gran}
        anchor={anchor}
        now={now}
        onClose={() => setPickerOpen(false)}
        onSelect={(g, a) => {
          setGran(g)
          setAnchor(a)
        }}
      />
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six },
  hero: { borderRadius: Spacing.four, padding: Spacing.four, gap: Spacing.one },
  heroAmount: { fontSize: 36, fontWeight: '700', lineHeight: 42 },
  actions: { flexDirection: 'row', gap: Spacing.three, marginTop: Spacing.three },
  action: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
  },
  actionAlt: { backgroundColor: 'rgba(255,255,255,0.14)' },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.two },
  sectionTitle: { fontSize: 24, lineHeight: 30 },
  period: { flexDirection: 'row', alignItems: 'center', gap: 1 },
  card: { borderRadius: Spacing.three, paddingHorizontal: Spacing.three, paddingVertical: Spacing.one },
  empty: { paddingVertical: Spacing.four, textAlign: 'center' },
  deleteBtn: { alignItems: 'center', paddingVertical: Spacing.three },
})
