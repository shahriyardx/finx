import { eq } from 'drizzle-orm'
import { useLiveQuery } from 'drizzle-orm/expo-sqlite'
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native'

import { ThemedText } from '@/components/themed-text'
import { ThemedView } from '@/components/themed-view'
import { Select } from '@/components/ui/select'
import { Spacing } from '@/constants/theme'
import { db } from '@/db/client'
import { createRecurring, updateRecurring } from '@/db/repo'
import { recurring, wallets } from '@/db/schema'
import { useTheme } from '@/hooks/use-theme'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/lib/categories'
import { parseMoney } from '@/lib/format'
import { FREQUENCIES, type Frequency, MONTHS, WEEKDAYS } from '@/lib/recurrence'

type Type = 'income' | 'expense'

const today = new Date()
// Max selectable day per month (Feb shows 29 so the leap day is pickable).
const MONTH_MAX_DAYS = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
const daysUpTo = (n: number) => Array.from({ length: n }, (_, i) => i + 1)

export default function RecurringForm() {
  const theme = useTheme()
  const router = useRouter()
  const navigation = useNavigation()
  const params = useLocalSearchParams<{ id?: string }>()
  const editId = params.id ? Number(params.id) : null
  const { data: walletRows } = useLiveQuery(db.select().from(wallets))
  const list = walletRows ?? []

  const { data: editRows } = useLiveQuery(
    db
      .select()
      .from(recurring)
      .where(eq(recurring.id, editId ?? -1)),
    [editId],
  )
  const existing = editId !== null ? editRows?.[0] : undefined

  const [type, setType] = useState<Type>('expense')
  const [amount, setAmount] = useState('')
  const [walletId, setWalletId] = useState<number | null>(null)
  const [category, setCategory] = useState('other')
  const [note, setNote] = useState('')
  const [frequency, setFrequency] = useState<Frequency>('monthly')
  const [interval, setIntervalValue] = useState('1')
  const [weekday, setWeekday] = useState(today.getDay())
  const [dayOfMonth, setDayOfMonth] = useState(today.getDate())
  const [month, setMonth] = useState(today.getMonth())
  const [postNow, setPostNow] = useState(false)
  const [saving, setSaving] = useState(false)

  const prefilled = useRef(false)
  useEffect(() => {
    if (existing && !prefilled.current) {
      prefilled.current = true
      setType(existing.type)
      setAmount((existing.amount / 100).toFixed(2))
      setWalletId(existing.walletId)
      setCategory(existing.category)
      setNote(existing.note ?? '')
      setFrequency(existing.frequency)
      setIntervalValue(String(existing.interval))
      if (existing.weekday != null) setWeekday(existing.weekday)
      if (existing.dayOfMonth != null) setDayOfMonth(existing.dayOfMonth)
      if (existing.month != null) setMonth(existing.month)
    }
  }, [existing])

  useEffect(() => {
    navigation.setOptions({ title: editId !== null ? 'Edit recurring' : 'New recurring' })
  }, [navigation, editId])

  const effectiveWallet = walletId ?? list[0]?.id ?? null
  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
  const minor = useMemo(() => parseMoney(amount), [amount])
  const every = Math.max(1, Number.parseInt(interval, 10) || 1)
  // Monthly can land on any month → allow up to 31; yearly limits to the picked month.
  const days = frequency === 'yearly' ? daysUpTo(MONTH_MAX_DAYS[month]) : daysUpTo(31)
  const canSave = minor > 0 && effectiveWallet !== null && !saving

  // Switching to a shorter month must not leave an out-of-range day selected.
  const pickMonth = (m: number) => {
    setMonth(m)
    setDayOfMonth((d) => Math.min(d, MONTH_MAX_DAYS[m]))
  }

  const save = async () => {
    if (!canSave || effectiveWallet === null) return
    setSaving(true)
    // Only the anchor field for the chosen frequency is stored; the rest are null.
    const anchor = {
      weekday: frequency === 'weekly' ? weekday : null,
      dayOfMonth: frequency === 'monthly' || frequency === 'yearly' ? dayOfMonth : null,
      month: frequency === 'yearly' ? month : null,
    }
    const common = {
      walletId: effectiveWallet,
      type,
      amount: minor,
      category,
      note: note.trim() || null,
      frequency,
      interval: every,
      ...anchor,
    }
    if (editId !== null) {
      await updateRecurring(editId, common)
    } else {
      await createRecurring({ ...common, postNow })
    }
    router.back()
  }

  if (list.length === 0) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.content}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
            Create a wallet first before adding a recurring transaction.
          </ThemedText>
          <Pressable
            onPress={() => router.replace('/modals/wallet-form')}
            style={[styles.save, { backgroundColor: theme.accent }]}>
            <ThemedText style={{ color: theme.onAccent, fontWeight: '700' }}>New wallet</ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    )
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">
        <View style={[styles.segment, { backgroundColor: theme.backgroundElement }]}>
          {(['expense', 'income'] as Type[]).map((t) => (
            <Pressable
              key={t}
              onPress={() => {
                setType(t)
                setCategory('other')
              }}
              style={[
                styles.segItem,
                type === t && { backgroundColor: t === 'income' ? theme.income : theme.expense },
              ]}>
              <ThemedText style={{ color: type === t ? '#fff' : theme.text, fontWeight: '700' }}>
                {t === 'income' ? 'Income' : 'Expense'}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        <ThemedText type="small" themeColor="textSecondary">
          Amount
        </ThemedText>
        <TextInput
          value={amount}
          onChangeText={setAmount}
          placeholder="0.00"
          placeholderTextColor={theme.textSecondary}
          keyboardType="decimal-pad"
          autoFocus
          style={[styles.amount, { color: theme.text, backgroundColor: theme.backgroundElement }]}
        />

        <ThemedText type="small" themeColor="textSecondary">
          Wallet
        </ThemedText>
        <View style={styles.chips}>
          {list.map((w) => (
            <Pressable
              key={w.id}
              onPress={() => setWalletId(w.id)}
              style={[
                styles.chip,
                { backgroundColor: theme.backgroundElement },
                effectiveWallet === w.id && { backgroundColor: theme.accent },
              ]}>
              <ThemedText style={{ color: effectiveWallet === w.id ? theme.onAccent : theme.text }}>
                {w.name}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        <ThemedText type="small" themeColor="textSecondary">
          Category
        </ThemedText>
        <Select title="Category" options={categories} value={category} onChange={setCategory} />

        <ThemedText type="small" themeColor="textSecondary">
          Repeats
        </ThemedText>
        <View style={styles.chips}>
          {FREQUENCIES.map((f) => (
            <Pressable
              key={f.key}
              onPress={() => setFrequency(f.key)}
              style={[
                styles.chip,
                { backgroundColor: theme.backgroundElement },
                frequency === f.key && { backgroundColor: theme.accent },
              ]}>
              <ThemedText style={{ color: frequency === f.key ? theme.onAccent : theme.text }}>{f.label}</ThemedText>
            </Pressable>
          ))}
        </View>

        {frequency === 'weekly' ? (
          <>
            <ThemedText type="small" themeColor="textSecondary">
              On day
            </ThemedText>
            <View style={styles.chips}>
              {WEEKDAYS.map((label, i) => (
                <Pressable
                  key={label}
                  onPress={() => setWeekday(i)}
                  style={[
                    styles.chip,
                    { backgroundColor: theme.backgroundElement },
                    weekday === i && { backgroundColor: theme.accent },
                  ]}>
                  <ThemedText style={{ color: weekday === i ? theme.onAccent : theme.text }}>{label}</ThemedText>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}

        {frequency === 'yearly' ? (
          <>
            <ThemedText type="small" themeColor="textSecondary">
              Month
            </ThemedText>
            <View style={styles.chips}>
              {MONTHS.map((label, i) => (
                <Pressable
                  key={label}
                  onPress={() => pickMonth(i)}
                  style={[
                    styles.chip,
                    { backgroundColor: theme.backgroundElement },
                    month === i && { backgroundColor: theme.accent },
                  ]}>
                  <ThemedText style={{ color: month === i ? theme.onAccent : theme.text }}>{label}</ThemedText>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}

        {frequency === 'monthly' || frequency === 'yearly' ? (
          <>
            <ThemedText type="small" themeColor="textSecondary">
              Day of month
            </ThemedText>
            <View style={styles.chips}>
              {days.map((d) => (
                <Pressable
                  key={d}
                  onPress={() => setDayOfMonth(d)}
                  style={[
                    styles.dayChip,
                    { backgroundColor: theme.backgroundElement },
                    dayOfMonth === d && { backgroundColor: theme.accent },
                  ]}>
                  <ThemedText style={{ color: dayOfMonth === d ? theme.onAccent : theme.text }}>{d}</ThemedText>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}

        <ThemedText type="small" themeColor="textSecondary">
          Every (interval)
        </ThemedText>
        <TextInput
          value={interval}
          onChangeText={setIntervalValue}
          placeholder="1"
          placeholderTextColor={theme.textSecondary}
          keyboardType="number-pad"
          style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
        />

        <ThemedText type="small" themeColor="textSecondary">
          Note (optional)
        </ThemedText>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="What is it for?"
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
        />

        {editId === null ? (
          <ThemedView type="backgroundElement" style={styles.switchRow}>
            <View style={styles.switchText}>
              <ThemedText type="default">Post one now</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Add a transaction immediately, then keep to the schedule.
              </ThemedText>
            </View>
            <Switch value={postNow} onValueChange={setPostNow} trackColor={{ true: theme.accent }} />
          </ThemedView>
        ) : null}

        <Pressable
          onPress={save}
          disabled={!canSave}
          style={[styles.save, { backgroundColor: theme.accent, opacity: canSave ? 1 : 0.5 }]}>
          <ThemedText style={{ color: theme.onAccent, fontWeight: '700' }}>Save</ThemedText>
        </Pressable>
      </ScrollView>
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.two, paddingBottom: Spacing.six },
  segment: { flexDirection: 'row', borderRadius: Spacing.three, padding: Spacing.half, marginBottom: Spacing.two },
  segItem: { flex: 1, paddingVertical: Spacing.two, borderRadius: Spacing.two, alignItems: 'center' },
  amount: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    fontSize: 28,
    fontWeight: '700',
    marginBottom: Spacing.two,
  },
  input: { borderRadius: Spacing.three, padding: Spacing.three, fontSize: 16, marginBottom: Spacing.two },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginBottom: Spacing.two },
  chip: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: Spacing.four },
  dayChip: {
    minWidth: 40,
    alignItems: 'center',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    marginTop: Spacing.two,
  },
  switchText: { flex: 1, gap: 2 },
  save: { marginTop: Spacing.three, padding: Spacing.three, borderRadius: Spacing.three, alignItems: 'center' },
  empty: { textAlign: 'center', paddingVertical: Spacing.four },
})
