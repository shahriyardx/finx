import { desc, eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { useConfirm } from '@/components/confirm-dialog';
import { Money } from '@/components/money';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { db } from '@/db/client';
import { deleteDebt, deletePayment } from '@/db/repo';
import { debtPayments, debts, persons, wallets } from '@/db/schema';
import { useTheme } from '@/hooks/use-theme';
import { formatDate } from '@/lib/format';

export default function DebtDetail() {
  const theme = useTheme();
  const router = useRouter();
  const confirm = useConfirm();
  const { id } = useLocalSearchParams<{ id: string }>();
  const debtId = Number(id);

  const { data: debtRows } = useLiveQuery(db.select().from(debts).where(eq(debts.id, debtId)), [debtId]);
  const { data: payRows } = useLiveQuery(
    db.select().from(debtPayments).where(eq(debtPayments.debtId, debtId)).orderBy(desc(debtPayments.date)),
    [debtId],
  );
  const { data: personRows } = useLiveQuery(db.select().from(persons));
  const { data: walletRows } = useLiveQuery(db.select().from(wallets));

  const debt = debtRows?.[0];
  const person = personRows?.find((p) => p.id === debt?.personId);
  const walletName = (wid: number | null) =>
    wid == null ? 'No wallet' : (walletRows?.find((w) => w.id === wid)?.name ?? 'Wallet');

  const confirmDeletePayment = async (paymentId: number) => {
    if (
      await confirm({
        title: 'Delete repayment',
        message: 'Outstanding will be restored and the wallet move reversed.',
      })
    ) {
      deletePayment(paymentId);
    }
  };

  const confirmDelete = async () => {
    if (
      await confirm({
        title: 'Delete debt',
        message: 'Removes this debt and its payment records. Wallet balances are not reversed.',
      })
    ) {
      await deleteDebt(debtId);
      router.back();
    }
  };

  if (!debt) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={styles.empty}>Debt not found.</ThemedText>
      </ThemedView>
    );
  }

  const isLend = debt.type === 'lend';
  const paid = debt.principal - debt.outstanding;
  const payments = payRows ?? [];

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: isLend ? 'Lent' : 'Borrowed' }} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.hero, { backgroundColor: theme.hero }]}>
          {person ? (
            <View style={styles.heroTop}>
              <Avatar name={person.name} uri={person.avatar} size={44} />
              <View style={styles.flex}>
                <ThemedText type="default" style={{ color: theme.heroText }}>
                  {person.name}
                </ThemedText>
                <ThemedText type="small" style={{ color: theme.heroAccent }}>
                  {isLend ? 'You lent' : 'You borrowed'} · {debt.status === 'settled' ? 'Settled' : 'Open'}
                </ThemedText>
              </View>
            </View>
          ) : null}

          <ThemedText type="small" style={{ color: theme.heroAccent }}>
            Outstanding
          </ThemedText>
          <Money value={debt.outstanding} themeColor="heroText" style={styles.heroAmount} />

          <View style={styles.heroSplit}>
            <View style={styles.heroCol}>
              <ThemedText type="small" style={{ color: theme.heroAccent }}>
                Principal
              </ThemedText>
              <Money value={debt.principal} style={{ color: theme.heroText }} type="smallBold" />
            </View>
            <View style={styles.heroCol}>
              <ThemedText type="small" style={{ color: theme.heroAccent }}>
                Repaid
              </ThemedText>
              <Money value={paid} style={{ color: theme.heroText }} type="smallBold" />
            </View>
          </View>
        </View>

        <ThemedView type="backgroundElement" style={styles.metaCard}>
          <Row label="Date" value={formatDate(debt.date)} />
          <Row label="Wallet" value={walletName(debt.walletId)} />
          {debt.note ? <Row label="Note" value={debt.note} /> : null}
        </ThemedView>

        {debt.status === 'open' ? (
          <View style={styles.actions}>
            <Pressable
              onPress={() => router.push(`/modals/payment-form?debtId=${debtId}`)}
              style={[styles.action, { backgroundColor: theme.accent }]}>
              <ThemedText style={{ color: theme.onAccent, fontWeight: '700' }}>Record payment</ThemedText>
            </Pressable>
            <Pressable onPress={confirmDelete} style={[styles.action, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText style={{ color: theme.expense, fontWeight: '700' }}>Delete</ThemedText>
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={confirmDelete} style={[styles.action, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText style={{ color: theme.expense, fontWeight: '700' }}>Delete</ThemedText>
          </Pressable>
        )}

        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Payments
        </ThemedText>
        {payments.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
            No repayments yet.
          </ThemedText>
        ) : (
          <>
            <ThemedView type="backgroundElement" style={styles.card}>
              {payments.map((p) => (
                <Pressable key={p.id} onLongPress={() => confirmDeletePayment(p.id)} style={styles.payRow}>
                  <View style={styles.flex}>
                    <ThemedText type="default">{formatDate(p.date)}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {walletName(p.walletId)}
                    </ThemedText>
                  </View>
                  <Money value={p.amount} themeColor="positive" type="smallBold" />
                </Pressable>
              ))}
            </ThemedView>
            <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
              Long-press a repayment to delete.
            </ThemedText>
          </>
        )}
      </ScrollView>
    </ThemedView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaRow}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="small">{value}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six },
  hero: { borderRadius: Spacing.four, padding: Spacing.four, gap: Spacing.one },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, marginBottom: Spacing.two },
  flex: { flex: 1, gap: 2 },
  heroAmount: { fontSize: 36, fontWeight: '700', lineHeight: 42 },
  heroSplit: { flexDirection: 'row', gap: Spacing.four, marginTop: Spacing.two },
  heroCol: { gap: 2 },
  metaCard: { borderRadius: Spacing.three, padding: Spacing.three, gap: Spacing.two },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.three },
  actions: { flexDirection: 'row', gap: Spacing.three },
  action: { flex: 1, paddingVertical: Spacing.three, borderRadius: Spacing.three, alignItems: 'center' },
  sectionTitle: { fontSize: 24, lineHeight: 30, marginTop: Spacing.two },
  card: { borderRadius: Spacing.three, paddingHorizontal: Spacing.three, paddingVertical: Spacing.one },
  payRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.two },
  empty: { paddingVertical: Spacing.four, textAlign: 'center' },
  hint: { textAlign: 'center' },
});
