import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { desc, eq } from 'drizzle-orm'
import { useLiveQuery } from 'drizzle-orm/expo-sqlite'
import { useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'

import { Money } from '@/components/money'
import { PeriodPicker } from '@/components/period-picker'
import { ThemedText } from '@/components/themed-text'
import { ThemedView } from '@/components/themed-view'
import { Spacing } from '@/constants/theme'
import { db } from '@/db/client'
import { transactions, wallets } from '@/db/schema'
import { useTheme } from '@/hooks/use-theme'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, type WalletIconName } from '@/lib/categories'
import { bounds, type Gran, MONTHS_FULL, periodLabel, shiftAnchor } from '@/lib/date-range'

type CatType = 'expense' | 'income'

const CAT_META = new Map([...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES].map((c) => [c.key, c]))

/** Horizontal proportion bar with a colored fill. */
function Bar({ pct, color, track }: { pct: number; color: string; track: string }) {
  return (
    <View style={[styles.barTrack, { backgroundColor: track }]}>
      <View style={[styles.barFill, { width: `${Math.max(pct, 1.5)}%`, backgroundColor: color }]} />
    </View>
  )
}

export default function ReportsScreen() {
  const theme = useTheme()
  const now = useMemo(() => new Date(), [])

  const [gran, setGran] = useState<Gran>('month')
  const [anchor, setAnchor] = useState<Date>(now)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [catType, setCatType] = useState<CatType>('expense')

  const { data } = useLiveQuery(
    db
      .select({
        type: transactions.type,
        amount: transactions.amount,
        category: transactions.category,
        date: transactions.date,
        walletId: transactions.walletId,
        walletName: wallets.name,
        walletColor: wallets.color,
      })
      .from(transactions)
      .leftJoin(wallets, eq(transactions.walletId, wallets.id))
      .orderBy(desc(transactions.date)),
  )
  const all = useMemo(() => data ?? [], [data])

  const inRange = useMemo(() => {
    const { start, end } = bounds(gran, anchor)
    return all.filter((t) => t.date >= start && t.date < end)
  }, [all, gran, anchor])

  const income = inRange.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const expense = inRange.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const net = income - expense
  const inOutMax = Math.max(income, expense, 1)

  // Category breakdown for the chosen type.
  const categories = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of inRange) {
      if (t.type !== catType) continue
      map.set(t.category, (map.get(t.category) ?? 0) + t.amount)
    }
    const rows = [...map.entries()].map(([key, amount]) => ({ key, amount })).sort((a, b) => b.amount - a.amount)
    const total = rows.reduce((s, r) => s + r.amount, 0)
    return { rows, total }
  }, [inRange, catType])

  // Spending per wallet (expenses) for the period.
  const byWallet = useMemo(() => {
    const map = new Map<string, { name: string; color: string; amount: number }>()
    for (const t of inRange) {
      if (t.type !== 'expense') continue
      const key = String(t.walletId)
      const cur = map.get(key)
      if (cur) cur.amount += t.amount
      else map.set(key, { name: t.walletName ?? 'Unknown', color: t.walletColor ?? theme.accent, amount: t.amount })
    }
    const rows = [...map.values()].sort((a, b) => b.amount - a.amount)
    const max = rows.reduce((m, r) => Math.max(m, r.amount), 1)
    return { rows, max }
  }, [inRange, theme.accent])

  // Last 6 months income vs expense (independent of the period selector).
  const trend = useMemo(() => {
    const months: { label: string; income: number; expense: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const start = d.getTime()
      const endMs = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime()
      let inc = 0
      let exp = 0
      for (const t of all) {
        if (t.date < start || t.date >= endMs) continue
        if (t.type === 'income') inc += t.amount
        else exp += t.amount
      }
      months.push({ label: MONTHS_FULL[d.getMonth()], income: inc, expense: exp })
    }
    const max = months.reduce((m, x) => Math.max(m, x.income, x.expense), 1)
    return { months, max }
  }, [all, now])

  const canStep = gran !== 'all'

  return (
    <ThemedView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* period selector */}
        <View style={styles.periodRow}>
          <Pressable onPress={() => setPickerOpen(true)} style={styles.period}>
            <ThemedText type="default" style={{ fontWeight: '700' }}>
              {periodLabel(gran, anchor)}
            </ThemedText>
            <MaterialCommunityIcons name="menu-down" size={18} color={theme.textSecondary} />
          </Pressable>
          <View style={styles.spacer} />
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

        {/* income vs expense + net */}
        <ThemedView type="backgroundElement" style={styles.card}>
          <View style={styles.ioRow}>
            <View>
              <ThemedText type="small" themeColor="textSecondary">
                Income
              </ThemedText>
              <Money value={income} themeColor="income" type="smallBold" />
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <ThemedText type="small" themeColor="textSecondary">
                Expense
              </ThemedText>
              <Money value={expense} themeColor="expense" type="smallBold" />
            </View>
          </View>
          <Bar pct={(income / inOutMax) * 100} color={theme.income} track={theme.background} />
          <Bar pct={(expense / inOutMax) * 100} color={theme.expense} track={theme.background} />
          <View style={styles.netRow}>
            <ThemedText type="small" themeColor="textSecondary">
              Net
            </ThemedText>
            <Money value={net} themeColor={net >= 0 ? 'positive' : 'negative'} type="smallBold" />
          </View>
        </ThemedView>

        {/* category breakdown */}
        <View style={styles.sectionHead}>
          <ThemedText type="subtitle">By category</ThemedText>
          <View style={[styles.segment, { backgroundColor: theme.backgroundElement }]}>
            {(['expense', 'income'] as CatType[]).map((t) => (
              <Pressable
                key={t}
                onPress={() => setCatType(t)}
                style={[styles.segItem, catType === t && { backgroundColor: theme.accent }]}>
                <ThemedText
                  type="small"
                  style={{ color: catType === t ? theme.onAccent : theme.text, fontWeight: '700' }}>
                  {t === 'expense' ? 'Expense' : 'Income'}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </View>

        <ThemedView type="backgroundElement" style={styles.card}>
          {categories.rows.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
              No {catType} this period.
            </ThemedText>
          ) : (
            categories.rows.map((r) => {
              const meta = CAT_META.get(r.key)
              const pct = (r.amount / categories.total) * 100
              const color = catType === 'expense' ? theme.expense : theme.income
              return (
                <View key={r.key} style={styles.catRow}>
                  <View style={styles.catTop}>
                    <View style={styles.catLeft}>
                      <MaterialCommunityIcons
                        name={(meta?.icon ?? 'dots-horizontal-circle') as WalletIconName}
                        size={18}
                        color={theme.text}
                      />
                      <ThemedText type="default">{meta?.label ?? r.key}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {pct.toFixed(0)}%
                      </ThemedText>
                    </View>
                    <Money value={r.amount} type="smallBold" />
                  </View>
                  <Bar pct={pct} color={color} track={theme.background} />
                </View>
              )
            })
          )}
        </ThemedView>

        {/* per-wallet spending */}
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Spending by wallet
        </ThemedText>
        <ThemedView type="backgroundElement" style={styles.card}>
          {byWallet.rows.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
              No spending this period.
            </ThemedText>
          ) : (
            byWallet.rows.map((w) => (
              <View key={w.name} style={styles.catRow}>
                <View style={styles.catTop}>
                  <View style={styles.catLeft}>
                    <View style={[styles.dot, { backgroundColor: w.color }]} />
                    <ThemedText type="default">{w.name}</ThemedText>
                  </View>
                  <Money value={w.amount} type="smallBold" />
                </View>
                <Bar pct={(w.amount / byWallet.max) * 100} color={w.color} track={theme.background} />
              </View>
            ))
          )}
        </ThemedView>

        {/* 6-month trend */}
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Last 6 months
        </ThemedText>
        <ThemedView type="backgroundElement" style={styles.card}>
          <View style={styles.trend}>
            {trend.months.map((m, i) => (
              <View key={`${m.label}-${i}`} style={styles.trendCol}>
                <View style={styles.trendBars}>
                  <View
                    style={[
                      styles.trendBar,
                      { height: `${(m.income / trend.max) * 100}%`, backgroundColor: theme.income },
                    ]}
                  />
                  <View
                    style={[
                      styles.trendBar,
                      { height: `${(m.expense / trend.max) * 100}%`, backgroundColor: theme.expense },
                    ]}
                  />
                </View>
                <ThemedText type="small" themeColor="textSecondary">
                  {m.label}
                </ThemedText>
              </View>
            ))}
          </View>
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: theme.income }]} />
              <ThemedText type="small" themeColor="textSecondary">
                Income
              </ThemedText>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: theme.expense }]} />
              <ThemedText type="small" themeColor="textSecondary">
                Expense
              </ThemedText>
            </View>
          </View>
        </ThemedView>
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
  content: { padding: Spacing.three, paddingBottom: Spacing.six, gap: Spacing.three },
  periodRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  period: { flexDirection: 'row', alignItems: 'center', gap: 1 },
  spacer: { flex: 1 },
  arrow: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  card: { borderRadius: Spacing.three, padding: Spacing.three, gap: Spacing.two },
  ioRow: { flexDirection: 'row', justifyContent: 'space-between' },
  netRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.one },
  barTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { marginTop: Spacing.one },
  segment: { flexDirection: 'row', borderRadius: Spacing.two, padding: Spacing.half },
  segItem: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.one, borderRadius: Spacing.two },
  catRow: { gap: Spacing.one, paddingVertical: Spacing.half },
  catTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  catLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, flex: 1 },
  empty: { textAlign: 'center', paddingVertical: Spacing.three },
  dot: { width: 12, height: 12, borderRadius: 6 },
  trend: { flexDirection: 'row', alignItems: 'flex-end', height: 120, gap: Spacing.one },
  trendCol: { flex: 1, alignItems: 'center', gap: Spacing.one },
  trendBars: { flexDirection: 'row', alignItems: 'flex-end', height: 100, gap: 2 },
  trendBar: { width: 10, borderTopLeftRadius: 3, borderTopRightRadius: 3, minHeight: 2 },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.three, marginTop: Spacing.one },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
})
