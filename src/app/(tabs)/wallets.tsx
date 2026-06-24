import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Money } from '@/components/money';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WalletCard } from '@/components/wallet-card';
import { Spacing } from '@/constants/theme';
import { db } from '@/db/client';
import { wallets } from '@/db/schema';
import { useTheme } from '@/hooks/use-theme';

export default function WalletsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { data } = useLiveQuery(db.select().from(wallets));
  const list = data ?? [];
  const total = list.reduce((s, w) => s + w.balance, 0);

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <SafeAreaView edges={['top']} style={styles.body}>
          <View style={styles.head}>
            <View>
              <ThemedText type="subtitle">Wallets</ThemedText>
              <Money value={total} type="small" themeColor="textSecondary" />
            </View>
            <Pressable
              onPress={() => router.push('/modals/wallet-form')}
              style={[styles.add, { backgroundColor: theme.accent }]}>
              <ThemedText style={{ color: theme.onAccent, fontWeight: '700' }}>+ Add</ThemedText>
            </Pressable>
          </View>

          {list.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
              No wallets yet. Add one to start tracking money.
            </ThemedText>
          ) : (
            <View style={styles.list}>
              {list.map((w) => (
                <WalletCard
                  key={w.id}
                  name={w.name}
                  balance={w.balance}
                  color={w.color}
                  icon={w.icon}
                  onPress={() => router.push(`/wallet/${w.id}`)}
                />
              ))}
            </View>
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
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  add: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: Spacing.three },
  list: { gap: Spacing.two, marginTop: Spacing.two },
  empty: { paddingVertical: Spacing.four, textAlign: 'center' },
});
