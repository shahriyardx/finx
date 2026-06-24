import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs/types';
import * as Haptics from 'expo-haptics';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

/** Per-route label + (outline / filled) icon pair. */
const TABS: Record<string, { label: string; icon: IconName; iconActive: IconName }> = {
  index: { label: 'Home', icon: 'home-outline', iconActive: 'home' },
  wallets: { label: 'Wallets', icon: 'wallet-outline', iconActive: 'wallet' },
  activity: { label: 'Activity', icon: 'receipt-text-outline', iconActive: 'receipt-text' },
  people: { label: 'People', icon: 'account-group-outline', iconActive: 'account-group' },
  settings: { label: 'Settings', icon: 'cog-outline', iconActive: 'cog' },
};

export function TabBar({ state, navigation }: BottomTabBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: theme.background,
          borderTopColor: theme.border,
          paddingBottom: Math.max(insets.bottom, Spacing.two),
        },
      ]}>
      {state.routes.map((route, index) => {
        const meta = TABS[route.name];
        if (!meta) return null;
        const focused = state.index === index;
        const color = focused ? theme.accent : theme.textSecondary;

        const onPress = () => {
          if (Platform.OS !== 'web') Haptics.selectionAsync();
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
        };

        return (
          <Pressable key={route.key} onPress={onPress} style={styles.tab} hitSlop={6}>
            <View style={[styles.pill, focused && { backgroundColor: theme.accentSoft }]}>
              <MaterialCommunityIcons name={focused ? meta.iconActive : meta.icon} size={24} color={color} />
            </View>
            <ThemedText type="small" style={[styles.label, { color, fontWeight: focused ? '700' : '500' }]}>
              {meta.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.two,
    paddingHorizontal: Spacing.one,
  },
  tab: { flex: 1, alignItems: 'center', gap: 2 },
  pill: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.four,
  },
  label: { fontSize: 11, lineHeight: 14 },
});
