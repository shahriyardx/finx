import { createContext, type ReactNode, useCallback, useContext, useRef, useState } from 'react'
import { Modal, Pressable, StyleSheet, View } from 'react-native'

import { ThemedText } from '@/components/themed-text'
import { Spacing } from '@/constants/theme'
import { useTheme } from '@/hooks/use-theme'

type ConfirmOptions = {
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<ConfirmFn | null>(null)

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const theme = useTheme()
  const [opts, setOpts] = useState<ConfirmOptions | null>(null)
  const resolver = useRef<((v: boolean) => void) | null>(null)

  const confirm = useCallback<ConfirmFn>((o) => {
    setOpts(o)
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve
    })
  }, [])

  const close = (value: boolean) => {
    resolver.current?.(value)
    resolver.current = null
    setOpts(null)
  }

  const destructive = opts?.destructive ?? true

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal visible={opts !== null} transparent animationType="fade" onRequestClose={() => close(false)}>
        <Pressable style={styles.backdrop} onPress={() => close(false)}>
          <Pressable
            style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
            onPress={() => {}}>
            <ThemedText type="subtitle" style={styles.title}>
              {opts?.title}
            </ThemedText>
            {opts?.message ? (
              <ThemedText type="small" themeColor="textSecondary" style={styles.message}>
                {opts.message}
              </ThemedText>
            ) : null}

            <View style={styles.actions}>
              <Pressable
                onPress={() => close(false)}
                style={[styles.btn, { backgroundColor: theme.backgroundSelected }]}>
                <ThemedText style={styles.btnText}>{opts?.cancelLabel ?? 'Cancel'}</ThemedText>
              </Pressable>
              <Pressable
                onPress={() => close(true)}
                style={[styles.btn, { backgroundColor: destructive ? theme.expense : theme.accent }]}>
                <ThemedText style={[styles.btnText, { color: destructive ? '#ffffff' : theme.onAccent }]}>
                  {opts?.confirmLabel ?? 'Delete'}
                </ThemedText>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ConfirmContext.Provider>
  )
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider')
  return ctx
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: Spacing.four,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  title: { fontSize: 22, lineHeight: 28 },
  message: { marginBottom: Spacing.two },
  actions: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.two },
  btn: { flex: 1, paddingVertical: Spacing.three, borderRadius: Spacing.three, alignItems: 'center' },
  btnText: { fontWeight: '700' },
})
