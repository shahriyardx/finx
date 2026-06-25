import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import * as Haptics from 'expo-haptics'
import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs/types'
import { Platform, Pressable, StyleSheet, View } from 'react-native'
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { ThemedText } from '@/components/themed-text'
import { Spacing } from '@/constants/theme'
import { useTheme } from '@/hooks/use-theme'

type IconName = keyof typeof MaterialCommunityIcons.glyphMap

/** A single tab with an animated pill + icon pop on focus. */
function TabItem({
  meta,
  focused,
  onPress,
}: {
  meta: { label: string; icon: IconName; iconActive: IconName }
  focused: boolean
  onPress: () => void
}) {
  const theme = useTheme()
  const color = focused ? theme.accent : theme.textSecondary

  const pillStyle = useAnimatedStyle(
    () => ({
      opacity: withTiming(focused ? 1 : 0, { duration: 180 }),
      transform: [{ scale: withTiming(focused ? 1 : 0.8, { duration: 180 }) }],
    }),
    [focused],
  )
  const iconStyle = useAnimatedStyle(
    () => ({ transform: [{ scale: withTiming(focused ? 1 : 0.92, { duration: 180 }) }] }),
    [focused],
  )

  return (
    <Pressable onPress={onPress} style={styles.tab} hitSlop={6}>
      <View style={styles.pillWrap}>
        <Animated.View style={[styles.pill, { backgroundColor: theme.accentSoft }, pillStyle]} />
        <Animated.View style={iconStyle}>
          <MaterialCommunityIcons name={focused ? meta.iconActive : meta.icon} size={24} color={color} />
        </Animated.View>
      </View>
      <ThemedText type="small" style={[styles.label, { color, fontWeight: focused ? '700' : '500' }]}>
        {meta.label}
      </ThemedText>
    </Pressable>
  )
}

/** Per-route label + (outline / filled) icon pair. */
const TABS: Record<string, { label: string; icon: IconName; iconActive: IconName }> = {
  index: { label: 'Home', icon: 'home-outline', iconActive: 'home' },
  wallets: { label: 'Wallets', icon: 'wallet-outline', iconActive: 'wallet' },
  activity: { label: 'Activity', icon: 'swap-vertical', iconActive: 'swap-vertical' },
  people: { label: 'People', icon: 'account-group-outline', iconActive: 'account-group' },
  settings: { label: 'Settings', icon: 'cog-outline', iconActive: 'cog' },
}

export function TabBar({ state, navigation }: BottomTabBarProps) {
  const theme = useTheme()
  const insets = useSafeAreaInsets()

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
        const meta = TABS[route.name]
        if (!meta) return null
        const focused = state.index === index

        const onPress = () => {
          if (Platform.OS !== 'web') Haptics.selectionAsync()
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true })
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name)
        }

        return <TabItem key={route.key} meta={meta} focused={focused} onPress={onPress} />
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.two,
    paddingHorizontal: Spacing.one,
  },
  tab: { flex: 1, alignItems: 'center', gap: 2 },
  pillWrap: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.one,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 999 },
  label: { fontSize: 11, lineHeight: 14 },
})
