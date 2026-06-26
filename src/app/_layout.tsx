import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator'
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { ActivityIndicator, StyleSheet, useColorScheme } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'

import { AuthProvider } from '@/auth/auth-context'
import { ConfirmProvider } from '@/components/confirm-dialog'
import { LockOverlay } from '@/components/lock-overlay'
import { NotificationRouter } from '@/components/notification-router'
import { RecurringRunner } from '@/components/recurring-runner'
import { SmsImporter } from '@/components/sms-importer'
import { ThemedText } from '@/components/themed-text'
import { ThemedView } from '@/components/themed-view'
import { Brand, Spacing } from '@/constants/theme'
import { db } from '@/db/client'
import migrations from '@/db/migrations'

function GateView({ message }: { message: string }) {
  return (
    <ThemedView style={styles.center}>
      <ActivityIndicator color={Brand.emerald} />
      <ThemedText type="small" style={styles.gap}>
        {message}
      </ThemedText>
    </ThemedView>
  )
}

function RootNavigator() {
  // The navigator is ALWAYS mounted; LockOverlay covers it when locked so the
  // current route + any in-progress form state survive a re-lock.
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="wallet/[id]" options={{ headerShown: true, title: 'Wallet' }} />
      <Stack.Screen name="transaction/[id]" options={{ headerShown: true, title: 'Transaction' }} />
      <Stack.Screen name="person/[id]" options={{ headerShown: true, title: 'Person' }} />
      <Stack.Screen name="debt/[id]" options={{ headerShown: true, title: 'Debt' }} />
      <Stack.Screen name="recurring" options={{ headerShown: true, title: 'Recurring' }} />
      <Stack.Screen name="reports" options={{ headerShown: true, title: 'Reports' }} />
      <Stack.Screen
        name="modals/transaction-form"
        options={{ presentation: 'modal', headerShown: true, title: 'New transaction' }}
      />
      <Stack.Screen
        name="modals/wallet-form"
        options={{ presentation: 'modal', headerShown: true, title: 'New wallet' }}
      />
      <Stack.Screen
        name="modals/person-form"
        options={{ presentation: 'modal', headerShown: true, title: 'New person' }}
      />
      <Stack.Screen
        name="modals/debt-form"
        options={{ presentation: 'modal', headerShown: true, title: 'Lend / Borrow' }}
      />
      <Stack.Screen
        name="modals/payment-form"
        options={{ presentation: 'modal', headerShown: true, title: 'Record payment' }}
      />
      <Stack.Screen
        name="modals/transfer-form"
        options={{ presentation: 'modal', headerShown: true, title: 'Transfer' }}
      />
      <Stack.Screen name="modals/receipt" options={{ presentation: 'modal', headerShown: true, title: 'Receipt' }} />
      <Stack.Screen
        name="modals/recurring-form"
        options={{ presentation: 'modal', headerShown: true, title: 'New recurring' }}
      />
      <Stack.Screen
        name="modals/change-pin"
        options={{ presentation: 'modal', headerShown: true, title: 'Change PIN' }}
      />
    </Stack>
  )
}

export default function RootLayout() {
  const colorScheme = useColorScheme()
  const { success, error } = useMigrations(db, migrations)

  if (error) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText type="subtitle">Database error</ThemedText>
        <ThemedText type="small" style={styles.gap}>
          {error.message}
        </ThemedText>
      </ThemedView>
    )
  }

  if (!success) return <GateView message="Preparing database…" />

  return (
    <GestureHandlerRootView style={styles.flex}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AuthProvider>
          <ConfirmProvider>
            <RootNavigator />
            <SmsImporter />
            <RecurringRunner />
            <NotificationRouter />
            <LockOverlay />
            <StatusBar style="auto" />
          </ConfirmProvider>
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two },
  gap: { marginTop: Spacing.one },
})
