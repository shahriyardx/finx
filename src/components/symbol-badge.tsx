import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Platform, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';

type Props = {
  symbol: SymbolViewProps['name'];
  /** Fallback glyph (letter/emoji) for platforms without SF Symbols. */
  fallback?: string;
  color: string;
  tint?: string;
  size?: number;
};

/** Rounded colored badge holding an SF Symbol (iOS) or a letter fallback. */
export function SymbolBadge({ symbol, fallback = '•', color, tint = '#ffffff', size = 40 }: Props) {
  return (
    <View
      style={[
        styles.badge,
        { width: size, height: size, borderRadius: size / 3, backgroundColor: color },
      ]}>
      {Platform.OS === 'ios' ? (
        <SymbolView name={symbol} size={size * 0.5} tintColor={tint} resizeMode="scaleAspectFit" />
      ) : (
        <ThemedText style={{ color: tint, fontSize: size * 0.4, fontWeight: '700' }}>
          {fallback}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignItems: 'center', justifyContent: 'center' },
});
