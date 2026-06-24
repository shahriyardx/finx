import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { desc, eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useConfirm } from '@/components/confirm-dialog';
import { EmptyState } from '@/components/empty-state';
import { Money } from '@/components/money';
import { PeriodPicker } from '@/components/period-picker';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TransactionRow } from '@/components/transaction-row';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { db } from '@/db/client';
import { deleteTransaction } from '@/db/repo';
import { transactions, wallets } from '@/db/schema';
import { useTheme } from '@/hooks/use-theme';
import { bounds, periodLabel, shiftAnchor, type Gran } from '@/lib/date-range';

type Filter = 'all' | 'income' | 'expense';
const TYPE_LABEL: Record<Filter, string> = { all: 'All', income: 'Income', expense: 'Expense' };

export default function ActivityScreen() {
  const theme = useTheme();
  const router = useRouter();
  const confirm = useConfirm();
  const now = useMemo(() => new Date(), []);

  const [filter, setFilter] = useState<Filter>('all');
  const [gran, setGran] = useState<Gran>('month');
  const [anchor, setAnchor] = useState<Date>(now);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  const { data } = useLiveQuery(
    db
      .select({
        id: transactions.id,
        type: transactions.type,
        amount: transactions.amount,
        category: transactions.category,
        note: transactions.note,
        date: transactions.date,
        walletName: wallets.name,
      })
      .from(transactions)
      .leftJoin(wallets, eq(transactions.walletId, wallets.id))
      .orderBy(desc(transactions.date)),
  );

  const inRange = useMemo(() => {
    const { start, end } = bounds(gran, anchor);
    return (data ?? []).filter((t) => t.date >= start && t.date < end);
  }, [data, gran, anchor]);

  const income = inRange.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const spent = inRange.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const rows = inRange.filter((t) => filter === 'all' || t.type === filter);

  const confirmDelete = async (id: number) => {
    if (await confirm({ title: 'Delete transaction', message: 'The wallet balance will be restored.' })) {
      deleteTransaction(id);
    }
  };

  const canStep = gran !== 'all';

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <SafeAreaView edges={['top']} style={styles.body}>
          {/* period navigator */}
          <View style={styles.nav}>
            <Pressable
              onPress={() => canStep && setAnchor((a) => shiftAnchor(gran, a, -1))}
              disabled={!canStep}
              hitSlop={10}
              style={[styles.navArrow, { backgroundColor: theme.backgroundElement, opacity: canStep ? 1 : 0.3 }]}>
              <MaterialCommunityIcons name="chevron-left" size={24} color={theme.text} />
            </Pressable>

            <Pressable onPress={() => setPickerOpen(true)} style={styles.navLabel}>
              <ThemedText type="default" style={{ fontWeight: '700' }}>
                {periodLabel(gran, anchor)}
              </ThemedText>
              <MaterialCommunityIcons name="menu-down" size={20} color={theme.textSecondary} />
            </Pressable>

            <Pressable
              onPress={() => canStep && setAnchor((a) => shiftAnchor(gran, a, 1))}
              disabled={!canStep}
              hitSlop={10}
              style={[styles.navArrow, { backgroundColor: theme.backgroundElement, opacity: canStep ? 1 : 0.3 }]}>
              <MaterialCommunityIcons name="chevron-right" size={24} color={theme.text} />
            </Pressable>
          </View>

          {/* income / expense for the period */}
          <View style={styles.summary}>
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

          {filter !== 'all' ? (
            <ThemedText type="small" themeColor="accent">
              Showing {TYPE_LABEL[filter]} only
            </ThemedText>
          ) : null}

          {rows.length === 0 ? (
            <EmptyState
              icon="swap-horizontal"
              title="No transactions"
              message="Nothing recorded for this period. Try another range or add a transaction."
              actionLabel="Add transaction"
              onAction={() => router.push('/modals/transaction-form')}
            />
          ) : (
            <ThemedView type="backgroundElement" style={styles.card}>
              {rows.map((t) => (
                <Pressable key={t.id} onLongPress={() => confirmDelete(t.id)}>
                  <TransactionRow
                    type={t.type}
                    amount={t.amount}
                    category={t.category}
                    note={t.note}
                    date={t.date}
                    subtitle={t.walletName ?? undefined}
                  />
                </Pressable>
              ))}
            </ThemedView>
          )}
        </SafeAreaView>
      </ScrollView>

      {/* FAB: type filter */}
      <Pressable
        onPress={() => setFilterOpen(true)}
        style={[styles.fab, { backgroundColor: theme.accent, bottom: BottomTabInset - Spacing.three }]}>
        <MaterialCommunityIcons name="filter-variant" size={26} color={theme.onAccent} />
        {filter !== 'all' ? <View style={[styles.fabDot, { backgroundColor: theme.expense }]} /> : null}
      </Pressable>

      <PeriodPicker
        visible={pickerOpen}
        gran={gran}
        anchor={anchor}
        now={now}
        onClose={() => setPickerOpen(false)}
        onSelect={(g, a) => {
          setGran(g);
          setAnchor(a);
        }}
      />

      {/* type filter menu */}
      <Modal visible={filterOpen} transparent animationType="fade" onRequestClose={() => setFilterOpen(false)}>
        <Pressable style={styles.menuBackdrop} onPress={() => setFilterOpen(false)}>
          <Pressable
            style={[styles.menu, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
            onPress={() => {}}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.menuTitle}>
              Show
            </ThemedText>
            {(['all', 'income', 'expense'] as Filter[]).map((f) => (
              <Pressable
                key={f}
                onPress={() => {
                  setFilter(f);
                  setFilterOpen(false);
                }}
                style={styles.menuItem}>
                <ThemedText
                  type="default"
                  style={{ color: filter === f ? theme.accent : theme.text, fontWeight: filter === f ? '700' : '500' }}>
                  {TYPE_LABEL[f]}
                </ThemedText>
                {filter === f ? (
                  <MaterialCommunityIcons name="check" size={20} color={theme.accent} />
                ) : null}
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.three, paddingBottom: Spacing.six },
  body: { gap: Spacing.three },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navArrow: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  navLabel: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  summary: { flexDirection: 'row', gap: Spacing.four },
  summaryCol: { gap: 2 },
  card: { borderRadius: Spacing.three, paddingHorizontal: Spacing.three, paddingVertical: Spacing.one },
  fab: {
    position: 'absolute',
    right: Spacing.three,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabDot: { position: 'absolute', top: 12, right: 12, width: 10, height: 10, borderRadius: 5 },
  menuBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: Spacing.five },
  menu: { borderRadius: Spacing.three, borderWidth: StyleSheet.hairlineWidth, padding: Spacing.three, gap: Spacing.one },
  menuTitle: { marginBottom: Spacing.one },
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.two },
});
