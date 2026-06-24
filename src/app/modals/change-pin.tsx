import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { useAuth } from '@/auth/auth-context';
import { setPin, verifyPin } from '@/auth/secure';
import { PinPad } from '@/components/pin-pad';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

type Step = 'current' | 'new' | 'confirm';

export default function ChangePin() {
  const router = useRouter();
  const { authenticateBiometric, biometricAvailable } = useAuth();
  const [step, setStep] = useState<Step>('current');
  const [next, setNext] = useState<string | null>(null);

  const handle = async (pin: string) => {
    if (step === 'current') {
      const ok = await verifyPin(pin);
      if (!ok) return false;
      setStep('new');
      return;
    }
    if (step === 'new') {
      setNext(pin);
      setStep('confirm');
      return;
    }
    // confirm
    if (pin !== next) {
      setNext(null);
      setStep('new');
      return false;
    }
    await setPin(pin);
    router.back();
  };

  // Forgot current PIN → verify identity with biometric, then skip to new PIN.
  const handleForgot = async () => {
    if (await authenticateBiometric()) setStep('new');
  };

  const titles: Record<Step, { title: string; subtitle: string }> = {
    current: { title: 'Current PIN', subtitle: 'Enter your existing PIN' },
    new: { title: 'New PIN', subtitle: 'Choose a new 4-digit PIN' },
    confirm: { title: 'Confirm PIN', subtitle: 'Re-enter the new PIN' },
  };

  return (
    <ThemedView style={styles.container}>
      <PinPad
        key={step}
        title={titles[step].title}
        subtitle={titles[step].subtitle}
        onComplete={handle}
        footer={
          step === 'current' && biometricAvailable ? (
            <Pressable onPress={handleForgot} hitSlop={12}>
              <ThemedText type="link" themeColor="accent">
                Forgot PIN? Use biometric
              </ThemedText>
            </Pressable>
          ) : null
        }
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
