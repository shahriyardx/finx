import * as LocalAuthentication from 'expo-local-authentication';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import {
  hasPin,
  isBiometricEnabled,
  setBiometricEnabled,
  setPin,
  verifyPin,
} from '@/auth/secure';

type Status = 'loading' | 'needsSetup' | 'locked' | 'unlocked';

/** Re-lock only after the app has been in the background this long. */
const GRACE_MS = 5 * 60 * 1000;

type AuthContextValue = {
  status: Status;
  biometricEnabled: boolean;
  biometricAvailable: boolean;
  setupPin: (pin: string) => Promise<void>;
  unlockWithPin: (pin: string) => Promise<boolean>;
  unlockWithBiometric: () => Promise<boolean>;
  authenticateBiometric: () => Promise<boolean>;
  enableBiometric: (enabled: boolean) => Promise<void>;
  resetPin: (pin: string) => Promise<void>;
  lock: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [biometricEnabled, setBiometricState] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const wasUnlocked = useRef(false);
  const backgroundedAt = useRef<number | null>(null);

  // Bootstrap: figure out initial lock state + biometric availability.
  useEffect(() => {
    (async () => {
      const [pinSet, bioEnabled, hardware, enrolled] = await Promise.all([
        hasPin(),
        isBiometricEnabled(),
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
      ]);
      setBiometricState(bioEnabled);
      setBiometricAvailable(hardware && enrolled);
      setStatus(pinSet ? 'locked' : 'needsSetup');
    })();
  }, []);

  // Track unlocked state for the AppState re-lock check.
  useEffect(() => {
    wasUnlocked.current = status === 'unlocked';
  }, [status]);

  // Re-lock only after the app has been backgrounded for the grace period.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'background' || next === 'inactive') {
        // Stamp the first time we leave the foreground while unlocked.
        if (wasUnlocked.current && backgroundedAt.current === null) {
          backgroundedAt.current = Date.now();
        }
      } else if (next === 'active') {
        const since = backgroundedAt.current;
        backgroundedAt.current = null;
        if (wasUnlocked.current && since !== null && Date.now() - since >= GRACE_MS) {
          setStatus('locked');
        }
      }
    });
    return () => sub.remove();
  }, []);

  const setupPin = useCallback(async (pin: string) => {
    await setPin(pin);
    setStatus('unlocked');
  }, []);

  const unlockWithPin = useCallback(async (pin: string) => {
    const ok = await verifyPin(pin);
    if (ok) setStatus('unlocked');
    return ok;
  }, []);

  const authenticateBiometric = useCallback(async () => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Unlock FinX',
      cancelLabel: 'Use PIN',
      disableDeviceFallback: true,
    });
    return result.success;
  }, []);

  const unlockWithBiometric = useCallback(async () => {
    const ok = await authenticateBiometric();
    if (ok) setStatus('unlocked');
    return ok;
  }, [authenticateBiometric]);

  const enableBiometric = useCallback(async (enabled: boolean) => {
    if (enabled) {
      const ok = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Confirm biometric for FinX',
      });
      if (!ok.success) return;
    }
    await setBiometricEnabled(enabled);
    setBiometricState(enabled);
  }, []);

  const resetPin = useCallback(async (pin: string) => {
    await setPin(pin);
    setStatus('unlocked');
  }, []);

  const lock = useCallback(() => setStatus('locked'), []);

  return (
    <AuthContext.Provider
      value={{
        status,
        biometricEnabled,
        biometricAvailable,
        setupPin,
        unlockWithPin,
        unlockWithBiometric,
        authenticateBiometric,
        enableBiometric,
        resetPin,
        lock,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
