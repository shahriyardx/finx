import * as Haptics from 'expo-haptics';
import { useCallback, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'] as const;

type Props = {
  title: string;
  subtitle?: string;
  pinLength?: number;
  /** Return false to signal a wrong PIN (triggers shake + clear). */
  onComplete: (pin: string) => boolean | void | Promise<boolean | void>;
  footer?: React.ReactNode;
};

export function PinPad({ title, subtitle, pinLength = 4, onComplete, footer }: Props) {
  const theme = useTheme();
  const [entry, setEntry] = useState('');
  const [busy, setBusy] = useState(false);
  const [shake] = useState(() => new Animated.Value(0));

  const runShake = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    Animated.sequence([
      Animated.timing(shake, { toValue: 12, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -12, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }, [shake]);

  const submit = useCallback(
    async (pin: string) => {
      setBusy(true);
      const ok = await onComplete(pin);
      setBusy(false);
      if (ok === false) {
        runShake();
        setEntry('');
      }
    },
    [onComplete, runShake],
  );

  const press = useCallback(
    (key: string) => {
      if (busy) return;
      if (key === 'del') {
        Haptics.selectionAsync();
        setEntry((e) => e.slice(0, -1));
        return;
      }
      if (key === '' || entry.length >= pinLength) return;
      Haptics.selectionAsync();
      const next = entry + key;
      setEntry(next);
      if (next.length === pinLength) submit(next);
    },
    [busy, entry, pinLength, submit],
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="subtitle" style={styles.title}>
          {title}
        </ThemedText>
        {subtitle ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.subtitle}>
            {subtitle}
          </ThemedText>
        ) : null}
      </View>

      <Animated.View style={[styles.dots, { transform: [{ translateX: shake }] }]}>
        {Array.from({ length: pinLength }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              { borderColor: theme.accent },
              i < entry.length && { backgroundColor: theme.accent },
            ]}
          />
        ))}
      </Animated.View>

      <View style={styles.pad}>
        {KEYS.map((key, i) =>
          key === '' ? (
            <View key={i} style={styles.key} />
          ) : (
            <Pressable
              key={i}
              onPress={() => press(key)}
              style={({ pressed }) => [
                styles.key,
                key !== 'del' && {
                  backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement,
                },
              ]}>
              <ThemedText style={styles.keyLabel}>{key === 'del' ? '⌫' : key}</ThemedText>
            </Pressable>
          ),
        )}
      </View>

      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </View>
  );
}

const KEY_SIZE = 72;

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: Spacing.five },
  header: { alignItems: 'center', gap: Spacing.one },
  title: { textAlign: 'center' },
  subtitle: { textAlign: 'center' },
  dots: { flexDirection: 'row', gap: Spacing.three },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2 },
  pad: { width: KEY_SIZE * 3 + Spacing.three * 2, flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  key: {
    width: KEY_SIZE,
    height: KEY_SIZE,
    borderRadius: KEY_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyLabel: { fontSize: 28, fontWeight: '500' },
  footer: { alignItems: 'center' },
});
