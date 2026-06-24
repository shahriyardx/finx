import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/auth-context';
import { useConfirm } from '@/components/confirm-dialog';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { resetData, setSetting, type ResetSelection } from '@/db/repo';
import { useCurrency } from '@/hooks/use-currency';
import { useTheme } from '@/hooks/use-theme';
import { CURRENCIES } from '@/lib/format';

type ResetKey = keyof ResetSelection;
const RESET_ITEMS: { key: ResetKey; label: string; hint: string }[] = [
  { key: 'transactions', label: 'Transactions', hint: 'All income & expenses; wallet balances reset to 0' },
  { key: 'wallets', label: 'Wallets', hint: 'Wallets and their transactions' },
  { key: 'people', label: 'People', hint: 'People and their debts & payments' },
  { key: 'debts', label: 'Debts', hint: 'All lend / borrow records & payments' },
];

export default function SettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const confirm = useConfirm();
  const currency = useCurrency();
  const { biometricEnabled, biometricAvailable, enableBiometric, lock } = useAuth();
  const [resetOpen, setResetOpen] = useState(false);
  const [sel, setSel] = useState<ResetSelection>({});

  const selectedCount = Object.values(sel).filter(Boolean).length;

  const toggle = (k: ResetKey) => setSel((s) => ({ ...s, [k]: !s[k] }));

  const runReset = async () => {
    const chosen = sel;
    const labels = RESET_ITEMS.filter((i) => chosen[i.key]).map((i) => i.label.toLowerCase());
    // Close the sheet first — otherwise the confirm dialog renders behind it.
    setResetOpen(false);
    const ok = await confirm({
      title: 'Delete selected data?',
      message: `Permanently deletes: ${labels.join(', ')}. This cannot be undone.`,
      confirmLabel: 'Delete',
    });
    if (!ok) {
      setResetOpen(true); // reopen so the user can adjust / retry
      return;
    }
    await resetData(chosen);
    setSel({});
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <SafeAreaView edges={['top']}>
          <ThemedText type="subtitle">Settings</ThemedText>

          <ThemedText type="small" themeColor="textSecondary" style={styles.label}>
            Currency
          </ThemedText>
          <View style={styles.chips}>
            {CURRENCIES.map((c) => (
              <Pressable
                key={c}
                onPress={() => setSetting('currency', c)}
                style={[
                  styles.chip,
                  { backgroundColor: theme.backgroundElement },
                  currency === c && { backgroundColor: theme.accent },
                ]}>
                <ThemedText style={{ color: currency === c ? theme.onAccent : theme.text, fontWeight: '600' }}>
                  {c}
                </ThemedText>
              </Pressable>
            ))}
          </View>

          <ThemedText type="small" themeColor="textSecondary" style={styles.label}>
            Security
          </ThemedText>
          <ThemedView type="backgroundElement" style={styles.card}>
            <View style={styles.rowBetween}>
              <View style={styles.flex}>
                <ThemedText type="default">Biometric unlock</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {biometricAvailable ? 'Use fingerprint / Face ID' : 'Not available on this device'}
                </ThemedText>
              </View>
              <Switch
                value={biometricEnabled}
                disabled={!biometricAvailable}
                onValueChange={enableBiometric}
                trackColor={{ true: theme.accent }}
              />
            </View>

            <View style={styles.btnRow}>
              <Pressable
                style={[styles.secBtn, { backgroundColor: theme.background }]}
                onPress={() => router.push('/modals/change-pin')}>
                <ThemedText type="default" style={{ fontWeight: '600' }}>
                  Change PIN
                </ThemedText>
              </Pressable>
              <Pressable style={[styles.secBtn, { backgroundColor: theme.accent }]} onPress={lock}>
                <ThemedText type="default" style={{ color: theme.onAccent, fontWeight: '700' }}>
                  Lock now
                </ThemedText>
              </Pressable>
            </View>
          </ThemedView>

          <ThemedText type="small" themeColor="textSecondary" style={styles.label}>
            Data
          </ThemedText>
          <ThemedView type="backgroundElement" style={styles.card}>
            <Pressable style={styles.rowBetween} onPress={() => setResetOpen(true)}>
              <ThemedText type="default" style={{ color: theme.expense }}>
                Reset data
              </ThemedText>
              <MaterialCommunityIcons name="chevron-right" size={22} color={theme.textSecondary} />
            </Pressable>
          </ThemedView>
        </SafeAreaView>
      </ScrollView>

      {/* reset-data selection modal */}
      <Modal visible={resetOpen} transparent animationType="slide" onRequestClose={() => setResetOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setResetOpen(false)}>
          <Pressable
            style={[styles.sheet, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
            onPress={() => {}}>
            <View style={styles.handle} />
            <ThemedText type="subtitle" style={styles.sheetTitle}>
              Reset data
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Select what to delete. This cannot be undone.
            </ThemedText>

            {RESET_ITEMS.map((item) => {
              const on = !!sel[item.key];
              return (
                <Pressable key={item.key} style={styles.resetRow} onPress={() => toggle(item.key)}>
                  <View
                    style={[
                      styles.checkbox,
                      { borderColor: theme.border },
                      on && { backgroundColor: theme.expense, borderColor: theme.expense },
                    ]}>
                    {on ? <MaterialCommunityIcons name="check" size={16} color="#fff" /> : null}
                  </View>
                  <View style={styles.flex}>
                    <ThemedText type="default">{item.label}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {item.hint}
                    </ThemedText>
                  </View>
                </Pressable>
              );
            })}

            <Pressable
              onPress={runReset}
              disabled={selectedCount === 0}
              style={[styles.deleteBtn, { backgroundColor: theme.expense, opacity: selectedCount === 0 ? 0.5 : 1 }]}>
              <ThemedText style={{ color: '#fff', fontWeight: '700' }}>
                {selectedCount === 0 ? 'Select data to delete' : `Delete selected (${selectedCount})`}
              </ThemedText>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.two, paddingBottom: Spacing.six },
  label: { marginTop: Spacing.three },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginTop: Spacing.one },
  chip: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: Spacing.four },
  card: { borderRadius: Spacing.three, padding: Spacing.three, marginTop: Spacing.one, gap: Spacing.two },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  btnRow: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.one },
  secBtn: { flex: 1, paddingVertical: Spacing.three, borderRadius: Spacing.three, alignItems: 'center' },
  flex: { flex: 1, gap: 2 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: Spacing.four,
    borderTopRightRadius: Spacing.four,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.four,
    paddingBottom: Spacing.six,
    gap: Spacing.three,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: '#8884' },
  sheetTitle: { fontSize: 22, lineHeight: 28 },
  resetRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: { marginTop: Spacing.two, padding: Spacing.three, borderRadius: Spacing.three, alignItems: 'center' },
});
