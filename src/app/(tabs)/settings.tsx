import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/auth-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { setSetting } from '@/db/repo';
import { useCurrency } from '@/hooks/use-currency';
import { useTheme } from '@/hooks/use-theme';
import { CURRENCIES } from '@/lib/format';

export default function SettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const currency = useCurrency();
  const { biometricEnabled, biometricAvailable, enableBiometric, lock } = useAuth();

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

            <Pressable style={styles.row} onPress={() => router.push('/modals/change-pin')}>
              <ThemedText type="default">Change PIN</ThemedText>
            </Pressable>

            <Pressable style={styles.row} onPress={lock}>
              <ThemedText type="default" themeColor="accent">
                Lock now
              </ThemedText>
            </Pressable>
          </ThemedView>
        </SafeAreaView>
      </ScrollView>
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
  row: { paddingVertical: Spacing.two },
  flex: { flex: 1, gap: 2 },
});
