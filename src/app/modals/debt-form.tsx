import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { db } from '@/db/client';
import { createDebt } from '@/db/repo';
import { persons, wallets } from '@/db/schema';
import { useTheme } from '@/hooks/use-theme';
import { parseMoney } from '@/lib/format';

type Type = 'lend' | 'borrow';

export default function DebtForm() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ personId?: string }>();
  const { data: personRows } = useLiveQuery(db.select().from(persons));
  const { data: walletRows } = useLiveQuery(db.select().from(wallets));
  const people = personRows ?? [];
  const walletList = walletRows ?? [];

  const [type, setType] = useState<Type>('lend');
  const [amount, setAmount] = useState('');
  const [personId, setPersonId] = useState<number | null>(
    params.personId ? Number(params.personId) : null,
  );
  const [walletId, setWalletId] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const lockedPersonId = params.personId ? Number(params.personId) : null;
  const effPerson = personId ?? people[0]?.id ?? null;
  const lockedPerson = lockedPersonId !== null ? people.find((p) => p.id === lockedPersonId) : undefined;
  const effWallet = walletId; // null = no wallet (does not affect balance)
  const minor = useMemo(() => parseMoney(amount), [amount]);
  const canSave = minor > 0 && effPerson !== null && !saving;

  const save = async () => {
    if (!canSave || effPerson === null) return;
    setSaving(true);
    await createDebt({ personId: effPerson, walletId: effWallet, type, amount: minor, note: note.trim() || undefined });
    router.back();
  };

  if (people.length === 0) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.content}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
            Add a person first.
          </ThemedText>
          <Pressable
            onPress={() => router.replace('/modals/person-form')}
            style={[styles.save, { backgroundColor: theme.accent }]}>
            <ThemedText style={{ color: theme.onAccent, fontWeight: '700' }}>New person</ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {lockedPerson ? (
          <View style={[styles.personHeader, { backgroundColor: theme.backgroundElement }]}>
            <Avatar name={lockedPerson.name} uri={lockedPerson.avatar} size={52} />
            <View style={styles.personInfo}>
              <ThemedText type="default">{lockedPerson.name}</ThemedText>
              {lockedPerson.phone ? (
                <ThemedText type="small" themeColor="textSecondary">
                  {lockedPerson.phone}
                </ThemedText>
              ) : null}
            </View>
          </View>
        ) : null}

        <View style={[styles.segment, { backgroundColor: theme.backgroundElement }]}>
          {(['lend', 'borrow'] as Type[]).map((t) => (
            <Pressable
              key={t}
              onPress={() => setType(t)}
              style={[styles.segItem, type === t && { backgroundColor: theme.accent }]}>
              <ThemedText style={{ color: type === t ? theme.onAccent : theme.text, fontWeight: '700' }}>
                {t === 'lend' ? 'Lend (money out)' : 'Borrow (money in)'}
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

        {lockedPerson ? null : (
          <>
            <ThemedText type="small" themeColor="textSecondary">
              Person
            </ThemedText>
            <View style={styles.chips}>
              {people.map((p) => (
                <Pressable
                  key={p.id}
                  onPress={() => setPersonId(p.id)}
                  style={[styles.chip, { backgroundColor: theme.backgroundElement }, effPerson === p.id && { backgroundColor: theme.accent }]}>
                  <ThemedText style={{ color: effPerson === p.id ? theme.onAccent : theme.text }}>{p.name}</ThemedText>
                </Pressable>
              ))}
            </View>
          </>
        )}

        <ThemedText type="small" themeColor="textSecondary">
          Wallet{' '}
          {effWallet === null ? '· tracking only, balance unchanged' : `· ${type === 'lend' ? 'money out' : 'money in'}`}
        </ThemedText>
        <View style={styles.chips}>
          <Pressable
            onPress={() => setWalletId(null)}
            style={[styles.chip, { backgroundColor: theme.backgroundElement }, effWallet === null && { backgroundColor: theme.accent }]}>
            <ThemedText style={{ color: effWallet === null ? theme.onAccent : theme.text }}>None</ThemedText>
          </Pressable>
          {walletList.map((w) => (
            <Pressable
              key={w.id}
              onPress={() => setWalletId(w.id)}
              style={[styles.chip, { backgroundColor: theme.backgroundElement }, effWallet === w.id && { backgroundColor: theme.accent }]}>
              <ThemedText style={{ color: effWallet === w.id ? theme.onAccent : theme.text }}>{w.name}</ThemedText>
            </Pressable>
          ))}
        </View>

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
  personHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three, borderRadius: Spacing.three, marginBottom: Spacing.two },
  personInfo: { flex: 1, gap: 2 },
});
