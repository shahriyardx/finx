import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/auth-context';
import { useConfirm } from '@/components/confirm-dialog';
import { SMS_IMPORT_KEY } from '@/components/sms-importer';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { db } from '@/db/client';
import { importData, resetData, setSetting, type ResetSelection } from '@/db/repo';
import { settings } from '@/db/schema';
import { useCurrency } from '@/hooks/use-currency';
import { useTheme } from '@/hooks/use-theme';
import { exportBackupFile, pickBackupFile } from '@/lib/backup';
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

  const { data: smsRows } = useLiveQuery(db.select().from(settings).where(eq(settings.key, SMS_IMPORT_KEY)));
  const smsImport = smsRows?.[0]?.value === '1';

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

  const doExport = async () => {
    try {
      const res = await exportBackupFile();
      if (res.method === 'saved') {
        await confirm({
          title: 'Backup saved',
          message: `Saved ${res.name} to your chosen folder.`,
          confirmLabel: 'OK',
          destructive: false,
        });
      }
    } catch (e) {
      await confirm({
        title: 'Export failed',
        message: e instanceof Error ? e.message : 'Could not export data.',
        confirmLabel: 'OK',
        destructive: false,
      });
    }
  };

  const doImport = async () => {
    try {
      const parsed = await pickBackupFile();
      if (parsed == null) return; // user cancelled the file picker
      const ok = await confirm({
        title: 'Import backup?',
        message: 'This replaces ALL current data with the file contents. Cannot be undone.',
        confirmLabel: 'Import',
      });
      if (!ok) return;
      const counts = await importData(parsed);
      await confirm({
        title: 'Import complete',
        message: `Restored ${counts.wallets} wallets, ${counts.transactions} transactions, ${counts.persons} people, ${counts.debts} debts.`,
        confirmLabel: 'OK',
        destructive: false,
      });
    } catch (e) {
      await confirm({
        title: 'Import failed',
        message: e instanceof Error ? e.message : 'Invalid or unreadable backup file.',
        confirmLabel: 'OK',
        destructive: false,
      });
    }
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

          {Platform.OS === 'android' ? (
            <>
              <ThemedText type="small" themeColor="textSecondary" style={styles.label}>
                Automation
              </ThemedText>
              <ThemedView type="backgroundElement" style={styles.card}>
                <View style={styles.rowBetween}>
                  <View style={styles.flex}>
                    <ThemedText type="default">Auto-import bank SMS</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      Add bank transactions as their SMS arrive. Map a bank to a wallet in the wallet’s settings.
                    </ThemedText>
                  </View>
                  <Switch
                    value={smsImport}
                    onValueChange={(on) => setSetting(SMS_IMPORT_KEY, on ? '1' : '0')}
                    trackColor={{ true: theme.accent }}
                  />
                </View>
              </ThemedView>
            </>
          ) : null}

          <ThemedText type="small" themeColor="textSecondary" style={styles.label}>
            Data
          </ThemedText>
          <ThemedView type="backgroundElement" style={styles.card}>
            <Pressable style={styles.rowBetween} onPress={doExport}>
              <View style={styles.dataRow}>
                <MaterialCommunityIcons name="export-variant" size={20} color={theme.text} />
                <ThemedText type="default">Export data</ThemedText>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={22} color={theme.textSecondary} />
            </Pressable>
            <Pressable style={styles.rowBetween} onPress={doImport}>
              <View style={styles.dataRow}>
                <MaterialCommunityIcons name="import" size={20} color={theme.text} />
                <ThemedText type="default">Import data</ThemedText>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={22} color={theme.textSecondary} />
            </Pressable>
            <Pressable style={styles.rowBetween} onPress={() => setResetOpen(true)}>
              <View style={styles.dataRow}>
                <MaterialCommunityIcons name="trash-can-outline" size={20} color={theme.expense} />
                <ThemedText type="default" style={{ color: theme.expense }}>
                  Reset data
                </ThemedText>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={22} color={theme.textSecondary} />
            </Pressable>
          </ThemedView>

          <ThemedText type="small" themeColor="textSecondary" style={styles.label}>
            About
          </ThemedText>
          <ThemedView type="backgroundElement" style={styles.card}>
            <Pressable
              style={styles.rowBetween}
              onPress={() => WebBrowser.openBrowserAsync('https://shahriyar.dev')}>
              <View style={styles.dataRow}>
                <MaterialCommunityIcons name="account-circle-outline" size={20} color={theme.text} />
                <ThemedText type="default">Developer</ThemedText>
              </View>
              <View style={styles.dataRow}>
                <ThemedText type="small" themeColor="textSecondary">
                  Shahriyar
                </ThemedText>
                <MaterialCommunityIcons name="open-in-new" size={20} color={theme.textSecondary} />
              </View>
            </Pressable>
            <Pressable
              style={styles.rowBetween}
              onPress={() => WebBrowser.openBrowserAsync('https://github.com/shahriyardx/finx')}>
              <View style={styles.dataRow}>
                <MaterialCommunityIcons name="github" size={20} color={theme.text} />
                <ThemedText type="default">Source code</ThemedText>
              </View>
              <MaterialCommunityIcons name="open-in-new" size={20} color={theme.textSecondary} />
            </Pressable>
            <Pressable
              style={styles.rowBetween}
              onPress={() => WebBrowser.openBrowserAsync('https://shahriyar.dev/apps/finx/privacy')}>
              <View style={styles.dataRow}>
                <MaterialCommunityIcons name="shield-lock-outline" size={20} color={theme.text} />
                <ThemedText type="default">Privacy policy</ThemedText>
              </View>
              <MaterialCommunityIcons name="open-in-new" size={20} color={theme.textSecondary} />
            </Pressable>
            <View style={styles.rowBetween}>
              <View style={styles.dataRow}>
                <MaterialCommunityIcons name="information-outline" size={20} color={theme.text} />
                <ThemedText type="default">Version</ThemedText>
              </View>
              <ThemedText type="small" themeColor="textSecondary">
                {Constants.expoConfig?.version ?? '—'}
              </ThemedText>
            </View>
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
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.one },
  dataRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
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
