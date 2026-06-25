import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useAuth } from '@/auth/auth-context'
import { PinPad } from '@/components/pin-pad'
import { ThemedText } from '@/components/themed-text'
import { Brand, Spacing } from '@/constants/theme'
import { useTheme } from '@/hooks/use-theme'

function SetupFlow() {
  const { setupPin } = useAuth()
  const [first, setFirst] = useState<string | null>(null)

  const handle = async (pin: string) => {
    if (first === null) {
      setFirst(pin)
      return
    }
    if (pin !== first) {
      setFirst(null)
      return false
    }
    await setupPin(pin)
  }

  return (
    <PinPad
      key={first === null ? 'enter' : 'confirm'}
      title={first === null ? 'Create a PIN' : 'Confirm your PIN'}
      subtitle={first === null ? 'Choose a 4-digit PIN to secure FinX' : 'Re-enter the same PIN to confirm'}
      onComplete={handle}
    />
  )
}

function LockFlow() {
  const { unlockWithPin, unlockWithBiometric, authenticateBiometric, resetPin, biometricEnabled, biometricAvailable } =
    useAuth()
  const [mode, setMode] = useState<'unlock' | 'reset'>('unlock')
  const [resetFirst, setResetFirst] = useState<string | null>(null)
  const promptedRef = useRef(false)

  // Auto-prompt biometric once when the lock appears.
  useEffect(() => {
    if (promptedRef.current) return
    promptedRef.current = true
    if (biometricEnabled && biometricAvailable) unlockWithBiometric()
  }, [biometricEnabled, biometricAvailable, unlockWithBiometric])

  const handleUnlock = (pin: string) => unlockWithPin(pin)

  const handleReset = async (pin: string) => {
    if (resetFirst === null) {
      setResetFirst(pin)
      return
    }
    if (pin !== resetFirst) {
      setResetFirst(null)
      return false
    }
    await resetPin(pin)
  }

  const handleForgot = async () => {
    if (await authenticateBiometric()) {
      setResetFirst(null)
      setMode('reset')
    }
  }

  if (mode === 'reset') {
    return (
      <PinPad
        key={resetFirst === null ? 'r-enter' : 'r-confirm'}
        title={resetFirst === null ? 'Set a new PIN' : 'Confirm new PIN'}
        subtitle={resetFirst === null ? 'Your data is safe' : 'Re-enter to confirm'}
        onComplete={handleReset}
      />
    )
  }

  return (
    <PinPad
      title="Enter PIN"
      subtitle="Unlock FinX"
      onComplete={handleUnlock}
      footer={
        biometricAvailable ? (
          <Pressable onPress={handleForgot} hitSlop={12}>
            <ThemedText type="link" themeColor="accent">
              Forgot PIN?
            </ThemedText>
          </Pressable>
        ) : null
      }
    />
  )
}

/**
 * Full-screen lock that sits ON TOP of the (always-mounted) navigator, so the
 * underlying screen and any in-progress form state survive a re-lock.
 */
export function LockOverlay() {
  const theme = useTheme()
  const { status } = useAuth()

  if (status === 'unlocked') return null

  return (
    <View style={[StyleSheet.absoluteFill, styles.overlay, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.safe}>
        {status === 'loading' ? (
          <ActivityIndicator color={Brand.emerald} />
        ) : status === 'needsSetup' ? (
          <SetupFlow />
        ) : (
          <LockFlow />
        )}
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  overlay: { zIndex: 1000, elevation: 1000 },
  safe: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: Spacing.four },
})
