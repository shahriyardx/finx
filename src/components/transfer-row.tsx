import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { StyleSheet, View } from 'react-native';

import { Money } from '@/components/money';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDate } from '@/lib/format';

type Props = {
  direction: 'out' | 'in';
  amount: number; // positive minor units
  otherName: string;
  note?: string | null;
  date: number;
};

export function TransferRow({ direction, amount, otherName, note, date }: Props) {
  const theme = useTheme();
  const signed = direction === 'in' ? amount : -amount;
  const label = direction === 'in' ? `From ${otherName}` : `To ${otherName}`;
  return (
    <View style={styles.row}>
      <View style={[styles.badge, { backgroundColor: theme.backgroundElement }]}>
        <MaterialCommunityIcons name="swap-horizontal" size={20} color={theme.text} />
      </View>
      <View style={styles.middle}>
        <ThemedText type="default" numberOfLines={1}>
          {note?.trim() || 'Transfer'}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {label} · {formatDate(date)}
        </ThemedText>
      </View>
      <Money value={signed} showPlus type="smallBold" themeColor="textSecondary" />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.two },
  badge: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  middle: { flex: 1, gap: 2 },
});
