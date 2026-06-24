import { eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WalletIconBadge } from '@/components/wallet-icon-badge';
import { Spacing } from '@/constants/theme';
import { db } from '@/db/client';
import { createWallet, updateWallet } from '@/db/repo';
import { wallets } from '@/db/schema';
import { useTheme } from '@/hooks/use-theme';
import { WALLET_COLORS, WALLET_ICONS, type WalletIconName } from '@/lib/categories';
import { parseMoney } from '@/lib/format';

export default function WalletFormScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const editId = params.id ? Number(params.id) : null;

  const { data } = useLiveQuery(
    db.select().from(wallets).where(eq(wallets.id, editId ?? -1)),
    [editId],
  );

  const [name, setName] = useState('');
  const [opening, setOpening] = useState('');
  const [color, setColor] = useState<string>(WALLET_COLORS[0]);
  const [icon, setIcon] = useState<WalletIconName>(WALLET_ICONS[0]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editId && !loaded && data?.[0]) {
      const w = data[0];
      /* eslint-disable react-hooks/set-state-in-effect */
      setName(w.name);
      setColor(w.color);
      setIcon(w.icon as WalletIconName);
      setLoaded(true);
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [editId, loaded, data]);

  const canSave = name.trim().length > 0 && !saving;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    if (editId) {
      await updateWallet(editId, { name: name.trim(), color, icon });
    } else {
      await createWallet({ name: name.trim(), color, icon, opening: parseMoney(opening) });
    }
    router.back();
  };

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: editId ? 'Edit wallet' : 'New wallet' }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ThemedText type="small" themeColor="textSecondary">
          Name
        </ThemedText>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. Cash, Bank"
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
          autoFocus={!editId}
        />

        {editId ? null : (
          <>
            <ThemedText type="small" themeColor="textSecondary">
              Opening balance
            </ThemedText>
            <TextInput
              value={opening}
              onChangeText={setOpening}
              placeholder="0.00"
              placeholderTextColor={theme.textSecondary}
              keyboardType="decimal-pad"
              style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
            />
          </>
        )}

        <ThemedText type="small" themeColor="textSecondary">
          Color
        </ThemedText>
        <View style={styles.colors}>
          {WALLET_COLORS.map((c) => (
            <Pressable
              key={c}
              onPress={() => setColor(c)}
              style={[
                styles.swatch,
                { backgroundColor: c },
                color === c && { borderColor: theme.text, borderWidth: 3 },
              ]}
            />
          ))}
        </View>

        <ThemedText type="small" themeColor="textSecondary">
          Icon
        </ThemedText>
        <View style={styles.icons}>
          {WALLET_ICONS.map((ic) => (
            <Pressable
              key={ic}
              onPress={() => setIcon(ic)}
              style={[styles.iconWrap, icon === ic && { borderColor: theme.accent, borderWidth: 3 }]}>
              <WalletIconBadge name={ic} color={color} size={44} />
            </Pressable>
          ))}
        </View>

        <Pressable
          onPress={save}
          disabled={!canSave}
          style={[styles.save, { backgroundColor: theme.accent, opacity: canSave ? 1 : 0.5 }]}>
          <ThemedText style={{ color: theme.onAccent, fontWeight: '700' }}>
            {editId ? 'Save changes' : 'Save wallet'}
          </ThemedText>
        </Pressable>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.two },
  input: { borderRadius: Spacing.three, padding: Spacing.three, fontSize: 16, marginBottom: Spacing.two },
  colors: { flexDirection: 'row', gap: Spacing.three, marginVertical: Spacing.two },
  swatch: { width: 40, height: 40, borderRadius: 20 },
  icons: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginVertical: Spacing.two },
  iconWrap: { borderRadius: 18, borderWidth: 3, borderColor: 'transparent', padding: 2 },
  save: { marginTop: Spacing.four, padding: Spacing.three, borderRadius: Spacing.three, alignItems: 'center' },
});
