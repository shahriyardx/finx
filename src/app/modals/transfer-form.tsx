import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { useConfirm } from '@/components/confirm-dialog';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { db } from '@/db/client';
import { createTransfer } from '@/db/repo';
import { wallets } from '@/db/schema';
import { useTheme } from '@/hooks/use-theme';
import { parseMoney } from '@/lib/format';

export default function TransferForm() {
  const theme = useTheme();
  const router = useRouter();
  const confirm = useConfirm();
  const params = useLocalSearchParams<{ fromWalletId?: string }>();
  const { data: walletRows } = useLiveQuery(db.select().from(wallets));
  const list = walletRows ?? [];

  const [fromId, setFromId] = useState<number | null>(
    params.fromWalletId ? Number(params.fromWalletId) : null,
  );
  const [toId, setToId] = useState<number | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const from = fromId ?? list[0]?.id ?? null;
  const minor = useMemo(() => parseMoney(amount), [amount]);
  const canSave = minor > 0 && from !== null && toId !== null && from !== toId && !saving;

  const save = async () => {
    if (!canSave || from === null || toId === null) return;
    setSaving(true);
    try {
      await createTransfer({ fromWalletId: from, toWalletId: toId, amount: minor, note: note.trim() || undefined });
      router.back();
    } catch (e) {
      setSaving(false);
      await confirm({
        title: 'Transfer failed',
        message: e instanceof Error ? e.message : 'Could not transfer.',
        confirmLabel: 'OK',
        destructive: false,
      });
    }
  };

  if (list.length < 2) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.content}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
            You need at least two wallets to transfer between them.
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  const renderChips = (selected: number | null, onPick: (id: number) => void, disabledId: number | null) => (
    <View style={styles.chips}>
      {list.map((w) => {
        const disabled = w.id === disabledId;
        const active = selected === w.id;
        return (
          <Pressable
            key={w.id}
            disabled={disabled}
            onPress={() => onPick(w.id)}
            style={[
              styles.chip,
              { backgroundColor: theme.backgroundElement, opacity: disabled ? 0.35 : 1 },
              active && { backgroundColor: theme.accent },
            ]}>
            <ThemedText style={{ color: active ? theme.onAccent : theme.text }}>{w.name}</ThemedText>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
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
          From
        </ThemedText>
        {renderChips(from, setFromId, toId)}

        <View style={styles.arrowRow}>
          <MaterialCommunityIcons name="arrow-down" size={22} color={theme.textSecondary} />
        </View>

        <ThemedText type="small" themeColor="textSecondary">
          To
        </ThemedText>
        {renderChips(toId, setToId, from)}

        <ThemedText type="small" themeColor="textSecondary">
          Note (optional)
        </ThemedText>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="What's it for?"
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
        />

        <Pressable
          onPress={save}
          disabled={!canSave}
          style={[styles.save, { backgroundColor: theme.accent, opacity: canSave ? 1 : 0.5 }]}>
          <ThemedText style={{ color: theme.onAccent, fontWeight: '700' }}>Transfer</ThemedText>
        </Pressable>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.two, paddingBottom: Spacing.six },
  amount: { borderRadius: Spacing.three, padding: Spacing.three, fontSize: 28, fontWeight: '700', marginBottom: Spacing.two },
  input: { borderRadius: Spacing.three, padding: Spacing.three, fontSize: 16, marginBottom: Spacing.two },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginBottom: Spacing.one },
  chip: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: Spacing.four },
  arrowRow: { alignItems: 'center', paddingVertical: Spacing.one },
  save: { marginTop: Spacing.three, padding: Spacing.three, borderRadius: Spacing.three, alignItems: 'center' },
  empty: { textAlign: 'center', paddingVertical: Spacing.four },
});
