import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { desc, eq } from 'drizzle-orm'
import { useLiveQuery } from 'drizzle-orm/expo-sqlite'
import { useRouter } from 'expo-router'
import { useMemo, useState } from 'react'
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { EmptyState } from '@/components/empty-state'
import { Money } from '@/components/money'
import { PeriodPicker } from '@/components/period-picker'
import { ThemedText } from '@/components/themed-text'
import { ThemedView } from '@/components/themed-view'
import { TransactionRow } from '@/components/transaction-row'
import { Spacing } from '@/constants/theme'
import { db } from '@/db/client'
import { transactions, wallets } from '@/db/schema'
import { useTheme } from '@/hooks/use-theme'
import { categoryLabel, EXPENSE_CATEGORIES, INCOME_CATEGORIES, type WalletIconName } from '@/lib/categories'
import { bounds, dayLabel, type Gran, groupByDay, periodLabel, shiftAnchor } from '@/lib/date-range'

type Filter = 'all' | 'income' | 'expense'
const TYPE_LABEL: Record<Filter, string> = { all: 'All', income: 'Income', expense: 'Expense' }
const ALL_CATEGORIES = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES].filter(
  (c, i, a) => a.findIndex((x) => x.key === c.key) === i,
)

export default function ActivityScreen() {
  const theme = useTheme()
  const router = useRouter()
  const now = useMemo(() => new Date(), [])
  const todayStart = useMemo(() => {
    const d = new Date(now)
    d.setHours(0, 0, 0, 0)
    return d.getTime()
  }, [now])

  const [filter, setFilter] = useState<Filter>('all')
  const [category, setCategory] = useState<string | null>(null)
  const [walletIds, setWalletIds] = useState<number[]>([])
  const [query, setQuery] = useState('')
  const [gran, setGran] = useState<Gran>('month')
  const [anchor, setAnchor] = useState<Date>(now)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)

  const { data: walletList } = useLiveQuery(
    db.select({ id: wallets.id, name: wallets.name, color: wallets.color, icon: wallets.icon }).from(wallets),
  )

  const { data } = useLiveQuery(
    db
      .select({
        id: transactions.id,
        type: transactions.type,
        amount: transactions.amount,
        category: transactions.category,
        note: transactions.note,
        receipt: transactions.receipt,
        date: transactions.date,
        walletId: transactions.walletId,
        walletName: wallets.name,
      })
      .from(transactions)
      .leftJoin(wallets, eq(transactions.walletId, wallets.id))
      .orderBy(desc(transactions.date)),
  )

  const inRange = useMemo(() => {
    const { start, end } = bounds(gran, anchor)
    return (data ?? []).filter((t) => t.date >= start && t.date < end)
  }, [data, gran, anchor])

  const income = inRange.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const spent = inRange.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

  const q = query.trim().toLowerCase()
  const rows = inRange.filter((t) => {
    if (filter !== 'all' && t.type !== filter) return false
    if (category && t.category !== category) return false
    if (walletIds.length && !walletIds.includes(t.walletId)) return false
    if (q) {
      const hay = `${t.note ?? ''} ${categoryLabel(t.category)} ${t.walletName ?? ''}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })

  const groups = useMemo(() => groupByDay(rows), [rows])

  const toggleWallet = (id: number) =>
    setWalletIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))

  const canStep = gran !== 'all'
  const filterActive = filter !== 'all' || category !== null

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.header}>
        {/* search + period */}
        <View style={styles.topRow}>
          <View style={[styles.search, { backgroundColor: theme.backgroundElement }]}>
            <MaterialCommunityIcons name="magnify" size={18} color={theme.textSecondary} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search transactions..."
              placeholderTextColor={theme.textSecondary}
              style={[styles.searchInput, { color: theme.text }]}
            />
            {query.length ? (
              <Pressable onPress={() => setQuery('')} hitSlop={8}>
                <MaterialCommunityIcons name="close-circle" size={16} color={theme.textSecondary} />
              </Pressable>
            ) : null}
          </View>

          <Pressable onPress={() => setPickerOpen(true)} style={styles.period}>
            <ThemedText type="default" style={{ fontWeight: '700' }}>
              {periodLabel(gran, anchor)}
            </ThemedText>
            <MaterialCommunityIcons name="menu-down" size={18} color={theme.textSecondary} />
          </Pressable>

          <Pressable
            onPress={() => canStep && setAnchor((a) => shiftAnchor(gran, a, -1))}
            disabled={!canStep}
            hitSlop={6}
            style={[styles.arrow, { backgroundColor: theme.backgroundElement, opacity: canStep ? 1 : 0.3 }]}>
            <MaterialCommunityIcons name="chevron-left" size={22} color={theme.text} />
          </Pressable>
          <Pressable
            onPress={() => canStep && setAnchor((a) => shiftAnchor(gran, a, 1))}
            disabled={!canStep}
            hitSlop={6}
            style={[styles.arrow, { backgroundColor: theme.backgroundElement, opacity: canStep ? 1 : 0.3 }]}>
            <MaterialCommunityIcons name="chevron-right" size={22} color={theme.text} />
          </Pressable>
        </View>

        {/* filter chips */}
        <View style={styles.chipsRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}
            style={styles.chipsScroll}>
            {(walletList ?? []).map((w) => {
              const active = walletIds.includes(w.id)
              return (
                <Pressable
                  key={w.id}
                  onPress={() => toggleWallet(w.id)}
                  style={[
                    styles.chip,
                    { backgroundColor: theme.backgroundElement, borderColor: active ? w.color : 'transparent' },
                  ]}>
                  <MaterialCommunityIcons name={w.icon as WalletIconName} size={16} color={w.color} />
                  <ThemedText type="small" style={{ fontWeight: '600' }}>
                    {w.name}
                  </ThemedText>
                </Pressable>
              )
            })}
            {category ? (
              <Pressable
                onPress={() => setCategory(null)}
                style={[styles.chip, { backgroundColor: theme.backgroundElement, borderColor: theme.accent }]}>
                <ThemedText type="small" style={{ fontWeight: '600' }}>
                  {categoryLabel(category)}
                </ThemedText>
                <MaterialCommunityIcons name="close" size={14} color={theme.textSecondary} />
              </Pressable>
            ) : null}
          </ScrollView>

          <Pressable onPress={() => setFilterOpen(true)} style={[styles.filterBtn, { backgroundColor: theme.accent }]}>
            <MaterialCommunityIcons name="filter-variant" size={20} color={theme.onAccent} />
            {filterActive ? <View style={[styles.filterDot, { backgroundColor: theme.expense }]} /> : null}
          </Pressable>
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* income / expense for the period + reports shortcut */}
        <View style={styles.summary}>
          <View style={styles.summaryGroup}>
            <View style={styles.summaryCol}>
              <ThemedText type="small" themeColor="textSecondary">
                Income
              </ThemedText>
              <Money value={income} themeColor="income" type="smallBold" />
            </View>
            <View style={styles.summaryCol}>
              <ThemedText type="small" themeColor="textSecondary">
                Expense
              </ThemedText>
              <Money value={spent} themeColor="expense" type="smallBold" />
            </View>
          </View>
          <Pressable
            onPress={() => router.push('/reports')}
            hitSlop={8}
            style={[styles.insights, { backgroundColor: theme.backgroundElement }]}>
            <MaterialCommunityIcons name="chart-box-outline" size={22} color={theme.accent} />
          </Pressable>
        </View>

        {rows.length === 0 ? (
          <EmptyState
            icon="swap-horizontal"
            title="No transactions"
            message="Nothing matches. Try another range, filter, or add a transaction."
            actionLabel="Add transaction"
            onAction={() => router.push('/modals/transaction-form')}
          />
        ) : (
          groups.map(([day, items]) => (
            <View key={day} style={styles.group}>
              <ThemedText type="small" themeColor="textSecondary" style={styles.groupLabel}>
                {dayLabel(day, todayStart)}
              </ThemedText>
              <ThemedView type="backgroundElement" style={styles.card}>
                {items.map((t) => (
                  <TransactionRow
                    key={t.id}
                    type={t.type}
                    amount={t.amount}
                    category={t.category}
                    note={t.note}
                    date={t.date}
                    subtitle={t.walletName ?? undefined}
                    hasReceipt={!!t.receipt}
                    onPress={() => router.push(`/transaction/${t.id}`)}
                  />
                ))}
              </ThemedView>
            </View>
          ))
        )}
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

      {/* type + category filter */}
      <Modal visible={filterOpen} transparent animationType="fade" onRequestClose={() => setFilterOpen(false)}>
        <Pressable style={styles.menuBackdrop} onPress={() => setFilterOpen(false)}>
          <Pressable
            style={[styles.menu, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
            onPress={() => {}}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.menuTitle}>
              Type
            </ThemedText>
            <View style={styles.segment}>
              {(['all', 'income', 'expense'] as Filter[]).map((f) => (
                <Pressable
                  key={f}
                  onPress={() => setFilter(f)}
                  style={[styles.segmentItem, { backgroundColor: filter === f ? theme.accent : theme.background }]}>
                  <ThemedText
                    type="small"
                    style={{ color: filter === f ? theme.onAccent : theme.text, fontWeight: '700' }}>
                    {TYPE_LABEL[f]}
                  </ThemedText>
                </Pressable>
              ))}
            </View>

            <ThemedText type="small" themeColor="textSecondary" style={styles.menuTitle}>
              Category
            </ThemedText>
            <View style={styles.catWrap}>
              <Pressable
                onPress={() => setCategory(null)}
                style={[
                  styles.catChip,
                  { backgroundColor: category === null ? theme.accent : theme.background, borderColor: theme.border },
                ]}>
                <ThemedText
                  type="small"
                  style={{ color: category === null ? theme.onAccent : theme.text, fontWeight: '600' }}>
                  All
                </ThemedText>
              </Pressable>
              {ALL_CATEGORIES.map((c) => (
                <Pressable
                  key={c.key}
                  onPress={() => setCategory(c.key)}
                  style={[
                    styles.catChip,
                    {
                      backgroundColor: category === c.key ? theme.accent : theme.background,
                      borderColor: theme.border,
                    },
                  ]}>
                  <MaterialCommunityIcons
                    name={c.icon}
                    size={14}
                    color={category === c.key ? theme.onAccent : theme.textSecondary}
                  />
                  <ThemedText
                    type="small"
                    style={{ color: category === c.key ? theme.onAccent : theme.text, fontWeight: '600' }}>
                    {c.label}
                  </ThemedText>
                </Pressable>
              ))}
            </View>

            <Pressable onPress={() => setFilterOpen(false)} style={[styles.doneBtn, { backgroundColor: theme.accent }]}>
              <ThemedText type="default" style={{ color: theme.onAccent, fontWeight: '700' }}>
                Done
              </ThemedText>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: Spacing.three, paddingTop: Spacing.one, gap: Spacing.two },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  search: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    height: 40,
    borderRadius: 20,
    paddingHorizontal: Spacing.three,
  },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },
  period: { flexDirection: 'row', alignItems: 'center', gap: 1, paddingHorizontal: Spacing.one },
  arrow: { width: 36, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  chipsRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  chipsScroll: { flex: 1 },
  chips: { gap: Spacing.two, paddingRight: Spacing.two, alignItems: 'center' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
  },
  filterBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  filterDot: { position: 'absolute', top: 7, right: 7, width: 8, height: 8, borderRadius: 4 },
  content: { padding: Spacing.three, paddingBottom: Spacing.six, gap: Spacing.three },
  summary: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryGroup: { flexDirection: 'row', gap: Spacing.five },
  summaryCol: { gap: 2 },
  insights: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  group: { gap: Spacing.one },
  groupLabel: { marginLeft: Spacing.one },
  card: { borderRadius: Spacing.three, paddingHorizontal: Spacing.three, paddingVertical: Spacing.one },
  menuBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: Spacing.five },
  menu: {
    borderRadius: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  menuTitle: { marginTop: Spacing.one },
  segment: { flexDirection: 'row', gap: Spacing.one },
  segmentItem: { flex: 1, paddingVertical: Spacing.two, borderRadius: 10, alignItems: 'center' },
  catWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  doneBtn: { marginTop: Spacing.two, paddingVertical: Spacing.two, borderRadius: 12, alignItems: 'center' },
})
