import type { ReactNode } from 'react'
import { ActivityIndicator, Pressable, type PressableProps, StyleSheet, type ViewStyle } from 'react-native'

import { ThemedText } from '@/components/themed-text'
import { Spacing } from '@/constants/theme'
import { useTheme } from '@/hooks/use-theme'

export type ButtonVariant = 'primary' | 'success' | 'danger' | 'outline' | 'ghost'
export type ButtonSize = 'sm' | 'md'

type Props = {
  label?: string
  children?: ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  onPress?: PressableProps['onPress']
  disabled?: boolean
  loading?: boolean
  leftIcon?: ReactNode
  /** Stretch to fill the cross axis (e.g. flex:1 inside a row). */
  fill?: boolean
  style?: ViewStyle
}

export function Button({
  label,
  children,
  variant = 'primary',
  size = 'md',
  onPress,
  disabled,
  loading,
  leftIcon,
  fill,
  style,
}: Props) {
  const theme = useTheme()

  const palette: Record<ButtonVariant, { bg: string; fg: string; border: string }> = {
    primary: { bg: theme.accent, fg: theme.onAccent, border: 'transparent' },
    success: { bg: theme.positive, fg: '#fff', border: 'transparent' },
    danger: { bg: theme.negative, fg: '#fff', border: 'transparent' },
    outline: { bg: 'transparent', fg: theme.text, border: theme.border },
    ghost: { bg: 'transparent', fg: theme.accent, border: 'transparent' },
  }
  const c = palette[variant]
  const isDisabled = disabled || loading

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        size === 'sm' ? styles.sm : styles.md,
        {
          backgroundColor: c.bg,
          borderColor: c.border,
          borderWidth: variant === 'outline' ? StyleSheet.hairlineWidth : 0,
        },
        fill && styles.fill,
        (pressed || isDisabled) && { opacity: isDisabled ? 0.5 : 0.7 },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={c.fg} />
      ) : (
        <>
          {leftIcon}
          {children ?? (
            <ThemedText type="default" style={{ color: c.fg, fontWeight: '700' }}>
              {label}
            </ThemedText>
          )}
        </>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderRadius: Spacing.three,
  },
  md: { paddingVertical: Spacing.three, paddingHorizontal: Spacing.four },
  sm: { paddingVertical: Spacing.two, paddingHorizontal: Spacing.three },
  fill: { flex: 1 },
})
