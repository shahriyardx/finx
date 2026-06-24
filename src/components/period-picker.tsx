import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { GRANS, MONTHS_FULL, type Gran } from '@/lib/date-range';

type Props = {
  visible: boolean;
  gran: Gran;
  anchor: Date;
  now: Date;
  onClose: () => void;
  onSelect: (gran: Gran, anchor: Date) => void;
};

export function PeriodPicker({ visible, gran, anchor, now, onClose, onSelect }: Props) {
  const theme = useTheme();
  const [pickYear, setPickYear] = useState(anchor.getFullYear());

  const choose = (g: Gran, a: Date) => {
    onSelect(g, a);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
          onPress={() => {}}>
          <View style={styles.handle} />

          <View style={styles.quick}>
            {GRANS.map((g) => (
              <Pressable
                key={g.key}
                onPress={() => choose(g.key, new Date(now))}
                style={[
                  styles.quickBtn,
                  { backgroundColor: theme.background },
                  gran === g.key && { backgroundColor: theme.accent },
                ]}>
                <ThemedText
                  type="small"
                  style={{ color: gran === g.key ? theme.onAccent : theme.text, fontWeight: '600' }}>
                  {g.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>

          <ThemedText type="small" themeColor="textSecondary" style={styles.section}>
            Pick a month
          </ThemedText>

          <View style={styles.yearRow}>
            <Pressable onPress={() => setPickYear((v) => v - 1)} hitSlop={10} style={styles.yearArrow}>
              <ThemedText type="subtitle">‹</ThemedText>
            </Pressable>
            <Pressable onPress={() => choose('year', new Date(pickYear, 0, 1))}>
              <ThemedText type="default" style={{ fontWeight: '700' }}>
                {pickYear}
              </ThemedText>
            </Pressable>
            <Pressable onPress={() => setPickYear((v) => v + 1)} hitSlop={10} style={styles.yearArrow}>
              <ThemedText type="subtitle">›</ThemedText>
            </Pressable>
          </View>

          <View style={styles.grid}>
            {MONTHS_FULL.map((mLabel, idx) => {
              const active = gran === 'month' && anchor.getFullYear() === pickYear && anchor.getMonth() === idx;
              return (
                <Pressable
                  key={mLabel}
                  onPress={() => choose('month', new Date(pickYear, idx, 1))}
                  style={[
                    styles.month,
                    { backgroundColor: theme.background },
                    active && { backgroundColor: theme.accent },
                  ]}>
                  <ThemedText
                    type="small"
                    style={{ color: active ? theme.onAccent : theme.text, fontWeight: '600' }}>
                    {mLabel}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: Spacing.four,
    borderTopRightRadius: Spacing.four,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.four,
    paddingBottom: Spacing.six,
    gap: Spacing.three,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: '#8884', marginBottom: Spacing.one },
  quick: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  quickBtn: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: Spacing.four },
  section: { marginTop: Spacing.one },
  yearRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.four },
  yearArrow: { paddingHorizontal: Spacing.two },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  month: {
    width: '23%',
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
  },
});
