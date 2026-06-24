import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { desc, gte } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { Link, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Money } from '@/components/money';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TransactionRow } from '@/components/transaction-row';
import { Brand, Spacing } from '@/constants/theme';
import { db } from '@/db/client';
import { transactions, wallets } from '@/db/schema';
import { useCurrency } from '@/hooks/use-currency';
import { useTheme } from '@/hooks/use-theme';

function monthStart(): number {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
}

export default function Dashboard() {
  const theme = useTheme();
  const router = useRouter();
  const currency = useCurrency();
  const { data: walletRows } = useLiveQuery(db.select().from(wallets));
  const { data: monthTxns } = useLiveQuery(
    db.select().from(transactions).where(gte(transactions.date, monthStart())),
  );
  const { data: recent } = useLiveQuery(
    db.select().from(transactions).orderBy(desc(transactions.date)).limit(6),
  );

  const total = (walletRows ?? []).reduce((s, w) => s + w.balance, 0);
  const income = (monthTxns ?? []).filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const spend = (monthTxns ?? []).filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <SafeAreaView edges={['top']} style={styles.body}>
          {/* Forest-green hero card */}
          <View style={[styles.hero, { backgroundColor: theme.hero }]}>
            <View style={[styles.badge, { backgroundColor: theme.heroAccent }]}>
              <ThemedText style={[styles.badgeText, { color: theme.hero }]}>{currency}</ThemedText>
            </View>
            <View style={styles.heroCol}>
              <ThemedText type="small" style={{ color: theme.heroAccent }}>
                Total balance
              </ThemedText>
              <Money value={total} plain themeColor="heroText" style={styles.heroAmount} />
            </View>
            <View style={styles.heroSplit}>
              <View style={styles.heroStat}>
                <View style={styles.statIcon}>
                  <MaterialCommunityIcons name="arrow-bottom-left" size={22} color={Brand.lime} />
                </View>
                <View style={styles.heroCol}>
                  <ThemedText type="small" style={{ color: Brand.lime }}>
                    Income
                  </ThemedText>
                  <Money value={income} plain style={{ color: theme.heroText }} type="smallBold" />
                </View>
              </View>
              <View style={styles.heroStat}>
                <View style={styles.statIcon}>
                  <MaterialCommunityIcons name="arrow-top-right" size={22} color={Brand.lime} />
                </View>
                <View style={styles.heroCol}>
                  <ThemedText type="small" style={{ color: Brand.lime }}>
                    Spent
                  </ThemedText>
                  <Money value={spend} plain style={{ color: theme.heroText }} type="smallBold" />
                </View>
              </View>
            </View>
          </View>

          <View style={styles.actions}>
            <Pressable
              style={[styles.action, { backgroundColor: theme.accent }]}
              onPress={() => router.push('/modals/transaction-form')}>
              <MaterialCommunityIcons name="plus-circle" size={20} color={theme.onAccent} />
              <ThemedText style={{ color: theme.onAccent, fontWeight: '700' }}>Transaction</ThemedText>
            </Pressable>
            <Pressable
              style={[styles.action, { backgroundColor: theme.backgroundElement }]}
              onPress={() => router.push('/(tabs)/wallets')}>
              <MaterialCommunityIcons name="wallet" size={20} color={theme.text} />
              <ThemedText style={{ fontWeight: '700' }}>Wallets</ThemedText>
            </Pressable>
          </View>

          <View style={styles.sectionHead}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Recent
            </ThemedText>
            <Link href="/(tabs)/activity">
              <ThemedText type="link" themeColor="accent">
                See all
              </ThemedText>
            </Link>
          </View>

          {(recent ?? []).length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
              No transactions yet. Add your first one above.
            </ThemedText>
          ) : (
            <ThemedView type="backgroundElement" style={styles.card}>
              {(recent ?? []).map((t) => (
                <TransactionRow
                  key={t.id}
                  type={t.type}
                  amount={t.amount}
                  category={t.category}
                  note={t.note}
                  date={t.date}
                  hasReceipt={!!t.receipt}
                  onPress={
                    t.receipt
                      ? () => router.push(`/modals/receipt?uri=${encodeURIComponent(t.receipt!)}`)
                      : undefined
                  }
                />
              ))}
            </ThemedView>
          )}
        </SafeAreaView>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.three, paddingBottom: Spacing.six },
  body: { gap: Spacing.three },
  hero: {
    borderRadius: Spacing.four,
    padding: Spacing.four,
    gap: Spacing.four,
    marginTop: Spacing.one,
  },
  badge: {
    position: 'absolute',
    top: Spacing.three,
    right: Spacing.three,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.four,
  },
  badgeText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  heroAmount: { fontSize: 40, fontWeight: '700', lineHeight: 46 },
  heroSplit: { flexDirection: 'row', gap: Spacing.four },
  heroStat: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  heroCol: { gap: 2 },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(159,232,112,0.18)',
  },
  actions: { flexDirection: 'row', gap: Spacing.three },
  action: {
    flex: 1,
    flexDirection: 'row',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.two },
  sectionTitle: { fontSize: 24, lineHeight: 30 },
  card: { borderRadius: Spacing.three, paddingHorizontal: Spacing.three, paddingVertical: Spacing.one },
  empty: { paddingVertical: Spacing.four, textAlign: 'center' },
});
