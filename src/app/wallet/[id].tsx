import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { desc, eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { useConfirm } from '@/components/confirm-dialog';
import { Money } from '@/components/money';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TransactionRow } from '@/components/transaction-row';
import { Spacing } from '@/constants/theme';
import { db } from '@/db/client';
import { deleteWallet } from '@/db/repo';
import { transactions, wallets } from '@/db/schema';
import { useTheme } from '@/hooks/use-theme';

export default function WalletDetail() {
  const theme = useTheme();
  const router = useRouter();
  const confirm = useConfirm();
  const { id } = useLocalSearchParams<{ id: string }>();
  const walletId = Number(id);

  const { data: walletRows } = useLiveQuery(
    db.select().from(wallets).where(eq(wallets.id, walletId)),
    [walletId],
  );
  const { data: txns } = useLiveQuery(
    db.select().from(transactions).where(eq(transactions.walletId, walletId)).orderBy(desc(transactions.date)),
    [walletId],
  );
  const wallet = walletRows?.[0];

  const confirmDelete = async () => {
    if (await confirm({ title: 'Delete wallet', message: 'This also removes its transactions.' })) {
      await deleteWallet(walletId);
      router.back();
    }
  };

  if (!wallet) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={styles.empty}>Wallet not found.</ThemedText>
      </ThemedView>
    );
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
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.hero, { backgroundColor: theme.hero }]}>
          <ThemedText type="small" style={{ color: theme.heroAccent }}>
            Balance
          </ThemedText>
          <Money value={wallet.balance} themeColor="heroText" style={styles.heroAmount} />
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={() => router.push(`/modals/transaction-form?walletId=${walletId}`)}
            style={[styles.action, { backgroundColor: theme.accent }]}>
            <ThemedText style={{ color: theme.onAccent, fontWeight: '700' }}>
              + Transaction
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={confirmDelete}
            style={[styles.action, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText style={{ color: theme.expense, fontWeight: '700' }}>Delete</ThemedText>
          </Pressable>
        </View>

        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Transactions
        </ThemedText>
        {(txns ?? []).length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
            No transactions in this wallet yet.
          </ThemedText>
        ) : (
          <ThemedView type="backgroundElement" style={styles.card}>
            {(txns ?? []).map((t) => (
              <TransactionRow
                key={t.id}
                type={t.type}
                amount={t.amount}
                category={t.category}
                note={t.note}
                date={t.date}
              />
            ))}
          </ThemedView>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six },
  hero: { borderRadius: Spacing.four, padding: Spacing.four, gap: Spacing.one },
  heroAmount: { fontSize: 36, fontWeight: '700', lineHeight: 42 },
  actions: { flexDirection: 'row', gap: Spacing.three },
  action: { flex: 1, paddingVertical: Spacing.three, borderRadius: Spacing.three, alignItems: 'center' },
  sectionTitle: { fontSize: 24, lineHeight: 30, marginTop: Spacing.two },
  card: { borderRadius: Spacing.three, paddingHorizontal: Spacing.three, paddingVertical: Spacing.one },
  empty: { paddingVertical: Spacing.four, textAlign: 'center' },
});
