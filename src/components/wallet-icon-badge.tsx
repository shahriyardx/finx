import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { StyleSheet, View } from 'react-native';

import type { WalletIconName } from '@/lib/categories';

type Props = {
  name: WalletIconName;
  color: string;
  tint?: string;
  size?: number;
};

/** Rounded colored badge holding a MaterialCommunityIcons vector glyph. */
export function WalletIconBadge({ name, color, tint = '#ffffff', size = 40 }: Props) {
  return (
    <View
      style={[
        styles.badge,
        { width: size, height: size, borderRadius: size / 3, backgroundColor: color },
      ]}>
      <MaterialCommunityIcons name={name} size={size * 0.55} color={tint} />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignItems: 'center', justifyContent: 'center' },
});
