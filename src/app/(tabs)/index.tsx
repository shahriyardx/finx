import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { desc, gte } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { Link, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent, Pressable, ScrollView, StyleSheet, View } from 'react-native';
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

/** Pick readable text (dark forest vs white) for a card tinted with `hex`. */
function readableText(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return '#ffffff';
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  // Relative luminance (sRGB) — bright cards get dark text.
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? Brand.forest : '#ffffff';
}

type Card = {
  key: string;
  label: string;
  bg: string;
  text: string;
  accent: string; // muted label color
  iconBg: string;
  balance: number;
  income: number;
  spend: number;
};

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

  const [cardWidth, setCardWidth] = useState(0);
  const [page, setPage] = useState(0);

  // Total card first, then one tinted card per wallet with its own month stats.
  const cards = useMemo<Card[]>(() => {
    const perWallet = new Map<number, { income: number; spend: number }>();
    for (const t of monthTxns ?? []) {
      const s = perWallet.get(t.walletId) ?? { income: 0, spend: 0 };
      if (t.type === 'income') s.income += t.amount;
      else s.spend += t.amount;
      perWallet.set(t.walletId, s);
    }
    const totalCard: Card = {
      key: 'total',
      label: 'Total balance',
      bg: theme.hero,
      text: theme.heroText,
      accent: theme.heroAccent,
      iconBg: 'rgba(159,232,112,0.18)',
      balance: total,
      income,
      spend,
    };
    const walletCards: Card[] = (walletRows ?? []).map((w) => {
      const s = perWallet.get(w.id) ?? { income: 0, spend: 0 };
      const text = readableText(w.color);
      const onWhite = text === '#ffffff';
      return {
        key: `w${w.id}`,
        label: w.name,
        bg: w.color,
        text,
        accent: onWhite ? 'rgba(255,255,255,0.85)' : 'rgba(22,51,0,0.7)',
        iconBg: onWhite ? 'rgba(255,255,255,0.2)' : 'rgba(22,51,0,0.12)',
        balance: w.balance,
        income: s.income,
        spend: s.spend,
      };
    });
    return [totalCard, ...walletCards];
  }, [walletRows, monthTxns, total, income, spend, theme.hero, theme.heroText, theme.heroAccent]);

  const onCarouselLayout = (e: LayoutChangeEvent) => setCardWidth(e.nativeEvent.layout.width);
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (cardWidth > 0) setPage(Math.round(e.nativeEvent.contentOffset.x / cardWidth));
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <SafeAreaView edges={['top']} style={styles.body}>
          {/* Swipable balance cards: Total + per-wallet */}
          <View onLayout={onCarouselLayout}>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={onScroll}
              scrollEventThrottle={16}>
              {cards.map((c) => (
                <View key={c.key} style={[styles.hero, { backgroundColor: c.bg, width: cardWidth || undefined }]}>
                  {c.key === 'total' ? (
                    <View style={[styles.badge, { backgroundColor: theme.heroAccent }]}>
                      <ThemedText style={[styles.badgeText, { color: theme.hero }]}>{currency}</ThemedText>
                    </View>
                  ) : null}
                  <View style={styles.heroCol}>
                    <ThemedText type="small" numberOfLines={1} style={[styles.cardLabel, { color: c.accent }]}>
                      {c.label}
                    </ThemedText>
                    <Money value={c.balance} plain style={[styles.heroAmount, { color: c.text }]} />
                  </View>
                  <View style={styles.heroSplit}>
                    <View style={styles.heroStat}>
                      <View style={[styles.statIcon, { backgroundColor: c.iconBg }]}>
                        <MaterialCommunityIcons name="arrow-bottom-left" size={22} color={c.text} />
                      </View>
                      <View style={styles.heroCol}>
                        <ThemedText type="small" style={{ color: c.accent }}>
                          Income
                        </ThemedText>
                        <Money value={c.income} plain style={{ color: c.text }} type="smallBold" />
                      </View>
                    </View>
                    <View style={styles.heroStat}>
                      <View style={[styles.statIcon, { backgroundColor: c.iconBg }]}>
                        <MaterialCommunityIcons name="arrow-top-right" size={22} color={c.text} />
                      </View>
                      <View style={styles.heroCol}>
                        <ThemedText type="small" style={{ color: c.accent }}>
                          Spent
                        </ThemedText>
                        <Money value={c.spend} plain style={{ color: c.text }} type="smallBold" />
                      </View>
                    </View>
                  </View>
                </View>
              ))}
            </ScrollView>
            {cards.length > 1 ? (
              <View style={styles.dots}>
                {cards.map((c, i) => (
                  <View
                    key={c.key}
                    style={[
                      styles.dot,
                      { backgroundColor: i === page ? theme.accent : theme.textSecondary, opacity: i === page ? 1 : 0.35 },
                    ]}
                  />
                ))}
              </View>
            ) : null}
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
                  onPress={() => router.push(`/transaction/${t.id}`)}
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
  cardLabel: { paddingRight: Spacing.five },
  heroAmount: { fontSize: 40, fontWeight: '700', lineHeight: 46 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.one, marginTop: Spacing.two },
  dot: { width: 7, height: 7, borderRadius: 4 },
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
