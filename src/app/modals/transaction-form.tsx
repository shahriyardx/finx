import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { db } from '@/db/client';
import { addTransaction } from '@/db/repo';
import { wallets } from '@/db/schema';
import { useTheme } from '@/hooks/use-theme';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/lib/categories';
import { parseMoney } from '@/lib/format';

type Type = 'income' | 'expense';

export default function TransactionForm() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ walletId?: string }>();
  const { data: walletRows } = useLiveQuery(db.select().from(wallets));
  const list = walletRows ?? [];

  const [type, setType] = useState<Type>('expense');
  const [amount, setAmount] = useState('');
  const [walletId, setWalletId] = useState<number | null>(
    params.walletId ? Number(params.walletId) : null,
  );
  const [category, setCategory] = useState('other');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const effectiveWallet = walletId ?? list[0]?.id ?? null;
  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const minor = useMemo(() => parseMoney(amount), [amount]);
  const canSave = minor > 0 && effectiveWallet !== null && !saving;

  const save = async () => {
    if (!canSave || effectiveWallet === null) return;
    setSaving(true);
    await addTransaction({ walletId: effectiveWallet, type, amount: minor, category, note: note.trim() || undefined });
    router.back();
  };

  if (list.length === 0) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.content}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
            Create a wallet first before adding transactions.
          </ThemedText>
          <Pressable
            onPress={() => router.replace('/modals/wallet-form')}
            style={[styles.save, { backgroundColor: theme.accent }]}>
            <ThemedText style={{ color: theme.onAccent, fontWeight: '700' }}>
              New wallet
            </ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* income / expense toggle */}
        <View style={[styles.segment, { backgroundColor: theme.backgroundElement }]}>
          {(['expense', 'income'] as Type[]).map((t) => (
            <Pressable
              key={t}
              onPress={() => {
                setType(t);
                setCategory('other');
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
        <View style={styles.chips}>
          {categories.map((c) => (
            <Pressable
              key={c.key}
              onPress={() => setCategory(c.key)}
              style={[
                styles.chip,
                { backgroundColor: theme.backgroundElement },
                category === c.key && { backgroundColor: theme.accent },
              ]}>
              <ThemedText style={{ color: category === c.key ? theme.onAccent : theme.text }}>
                {c.label}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        <ThemedText type="small" themeColor="textSecondary">
          Note (optional)
        </ThemedText>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="What was it for?"
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
        />

        <Pressable
          onPress={save}
          disabled={!canSave}
          style={[styles.save, { backgroundColor: theme.accent, opacity: canSave ? 1 : 0.5 }]}>
          <ThemedText style={{ color: theme.onAccent, fontWeight: '700' }}>Save</ThemedText>
        </Pressable>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.two, paddingBottom: Spacing.six },
  segment: { flexDirection: 'row', borderRadius: Spacing.three, padding: Spacing.half, marginBottom: Spacing.two },
  segItem: { flex: 1, paddingVertical: Spacing.two, borderRadius: Spacing.two, alignItems: 'center' },
  amount: { borderRadius: Spacing.three, padding: Spacing.three, fontSize: 28, fontWeight: '700', marginBottom: Spacing.two },
  input: { borderRadius: Spacing.three, padding: Spacing.three, fontSize: 16, marginBottom: Spacing.two },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginBottom: Spacing.two },
  chip: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: Spacing.four },
  save: { marginTop: Spacing.three, padding: Spacing.three, borderRadius: Spacing.three, alignItems: 'center' },
  empty: { textAlign: 'center', paddingVertical: Spacing.four },
});
