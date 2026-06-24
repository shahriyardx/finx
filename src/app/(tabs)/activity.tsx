import { desc, eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useConfirm } from '@/components/confirm-dialog';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TransactionRow } from '@/components/transaction-row';
import { Spacing } from '@/constants/theme';
import { db } from '@/db/client';
import { deleteTransaction } from '@/db/repo';
import { transactions, wallets } from '@/db/schema';
import { useTheme } from '@/hooks/use-theme';

type Filter = 'all' | 'income' | 'expense';

export default function ActivityScreen() {
  const theme = useTheme();
  const confirm = useConfirm();
  const [filter, setFilter] = useState<Filter>('all');

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

  const rows = (data ?? []).filter((t) => filter === 'all' || t.type === filter);

  const confirmDelete = async (id: number) => {
    if (await confirm({ title: 'Delete transaction', message: 'The wallet balance will be restored.' })) {
      deleteTransaction(id);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <SafeAreaView edges={['top']} style={styles.body}>
          <ThemedText type="subtitle">Activity</ThemedText>

          <View style={[styles.segment, { backgroundColor: theme.backgroundElement }]}>
            {(['all', 'income', 'expense'] as Filter[]).map((f) => (
              <Pressable
                key={f}
                onPress={() => setFilter(f)}
                style={[styles.segItem, filter === f && { backgroundColor: theme.accent }]}>
                <ThemedText
                  style={{ color: filter === f ? theme.onAccent : theme.text, fontWeight: '600' }}>
                  {f === 'all' ? 'All' : f === 'income' ? 'Income' : 'Expense'}
                </ThemedText>
              </Pressable>
            ))}
          </View>

          {rows.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
              Nothing here yet.
            </ThemedText>
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
          <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
            Long-press a row to delete.
          </ThemedText>
        </SafeAreaView>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.three, paddingBottom: Spacing.six },
  body: { gap: Spacing.three },
  segment: { flexDirection: 'row', borderRadius: Spacing.three, padding: Spacing.half, marginTop: Spacing.two },
  segItem: { flex: 1, paddingVertical: Spacing.two, borderRadius: Spacing.two, alignItems: 'center' },
  card: { borderRadius: Spacing.three, paddingHorizontal: Spacing.three, paddingVertical: Spacing.one },
  empty: { paddingVertical: Spacing.four, textAlign: 'center' },
  hint: { textAlign: 'center' },
});
