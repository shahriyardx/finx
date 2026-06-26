import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { useState } from 'react'
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native'

import { ThemedText } from '@/components/themed-text'
import { Spacing } from '@/constants/theme'
import { useTheme } from '@/hooks/use-theme'
import type { WalletIconName } from '@/lib/categories'

export type SelectOption = { key: string; label: string; icon?: WalletIconName }

type Props = {
  options: SelectOption[]
  value: string
  onChange: (key: string) => void
  placeholder?: string
  /** Sheet heading. */
  title?: string
}

/** A tappable field that opens a bottom-sheet list — good for long option sets. */
export function Select({ options, value, onChange, placeholder = 'Select', title }: Props) {
  const theme = useTheme()
  const [open, setOpen] = useState(false)
  const selected = options.find((o) => o.key === value)

  return (
    <>
      <Pressable onPress={() => setOpen(true)} style={[styles.field, { backgroundColor: theme.backgroundElement }]}>
        <View style={styles.fieldLeft}>
          {selected?.icon ? <MaterialCommunityIcons name={selected.icon} size={20} color={theme.text} /> : null}
          <ThemedText style={{ color: selected ? theme.text : theme.textSecondary }}>
            {selected?.label ?? placeholder}
          </ThemedText>
        </View>
        <MaterialCommunityIcons name="chevron-down" size={22} color={theme.textSecondary} />
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable
            style={[styles.sheet, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
            onPress={() => {}}>
            <View style={styles.handle} />
            {title ? (
              <ThemedText type="subtitle" style={styles.title}>
                {title}
              </ThemedText>
            ) : null}
            <ScrollView showsVerticalScrollIndicator={false} style={styles.list}>
              {options.map((o) => {
                const on = o.key === value
                return (
                  <Pressable
                    key={o.key}
                    style={styles.row}
                    onPress={() => {
                      onChange(o.key)
                      setOpen(false)
                    }}>
                    <View style={styles.rowLeft}>
                      {o.icon ? (
                        <MaterialCommunityIcons name={o.icon} size={20} color={on ? theme.accent : theme.text} />
                      ) : null}
                      <ThemedText style={{ color: on ? theme.accent : theme.text, fontWeight: on ? '700' : '400' }}>
                        {o.label}
                      </ThemedText>
                    </View>
                    {on ? <MaterialCommunityIcons name="check" size={20} color={theme.accent} /> : null}
                  </Pressable>
                )
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Spacing.three,
    padding: Spacing.three,
    marginBottom: Spacing.two,
  },
  fieldLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: Spacing.four,
    borderTopRightRadius: Spacing.four,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.four,
    paddingBottom: Spacing.six,
    gap: Spacing.two,
    maxHeight: '70%',
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: '#8884' },
  title: { fontSize: 22, lineHeight: 28, marginBottom: Spacing.one },
  list: { flexGrow: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.three,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
})
