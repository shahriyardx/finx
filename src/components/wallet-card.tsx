import { Pressable, StyleSheet, View } from 'react-native';

import { Money } from '@/components/money';
import { ThemedText } from '@/components/themed-text';
import { WalletIconBadge } from '@/components/wallet-icon-badge';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { WalletIconName } from '@/lib/categories';

type Props = {
  name: string;
  balance: number;
  color: string;
  icon: string;
  onPress?: () => void;
};

export function WalletCard({ name, balance, color, icon, onPress }: Props) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement },
      ]}>
      <WalletIconBadge name={icon as WalletIconName} color={color} />
      <View style={styles.middle}>
        <ThemedText type="default">{name}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Balance
        </ThemedText>
      </View>
      <Money value={balance} type="smallBold" signed={balance < 0} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  middle: { flex: 1, gap: 2 },
});
