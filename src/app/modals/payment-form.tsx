import { eq } from 'drizzle-orm'
import { useLiveQuery } from 'drizzle-orm/expo-sqlite'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native'

import { Money } from '@/components/money'
import { ThemedText } from '@/components/themed-text'
import { ThemedView } from '@/components/themed-view'
import { Spacing } from '@/constants/theme'
import { db } from '@/db/client'
import { recordPayment } from '@/db/repo'
import { debts, wallets } from '@/db/schema'
import { useTheme } from '@/hooks/use-theme'
import { parseMoney } from '@/lib/format'

export default function PaymentForm() {
  const theme = useTheme()
  const router = useRouter()
  const { debtId } = useLocalSearchParams<{ debtId: string }>()
  const id = Number(debtId)

  const { data: debtRows } = useLiveQuery(db.select().from(debts).where(eq(debts.id, id)), [id])
  const { data: walletRows } = useLiveQuery(db.select().from(wallets))
  const debt = debtRows?.[0]
  const walletList = walletRows ?? []

  const [amount, setAmount] = useState('')
  // undefined = follow the debt's wallet; null = None (no balance change)
  const [walletSel, setWalletSel] = useState<number | null | undefined>(undefined)
  const [saving, setSaving] = useState(false)

  const effWallet = walletSel === undefined ? (debt?.walletId ?? null) : walletSel
  const minor = useMemo(() => parseMoney(amount), [amount])
  const canSave = minor > 0 && debt != null && !saving

  const save = async () => {
    if (!canSave || debt == null) return
    setSaving(true)
    await recordPayment({ debtId: id, amount: minor, walletId: effWallet })
    router.back()
  }

  if (!debt) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={styles.empty}>Debt not found.</ThemedText>
      </ThemedView>
    )
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">
        <View style={[styles.summary, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText type="small" themeColor="textSecondary">
            {debt.type === 'lend' ? 'They owe you' : 'You owe'}
          </ThemedText>
          <Money value={debt.outstanding} type="subtitle" />
        </View>

        <ThemedText type="small" themeColor="textSecondary">
          Payment amount
        </ThemedText>
        <View style={styles.amountRow}>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            placeholderTextColor={theme.textSecondary}
            keyboardType="decimal-pad"
            autoFocus
            style={[styles.amount, { color: theme.text, backgroundColor: theme.backgroundElement }]}
          />
          <Pressable
            onPress={() => setAmount((debt.outstanding / 100).toFixed(2))}
            style={[styles.full, { backgroundColor: theme.backgroundSelected }]}>
            <ThemedText style={{ fontWeight: '700' }}>Full</ThemedText>
          </Pressable>
        </View>

        <ThemedText type="small" themeColor="textSecondary">
          {effWallet === null
            ? 'Cash · balance unchanged'
            : debt.type === 'lend'
              ? 'Receive into wallet'
              : 'Pay from wallet'}
        </ThemedText>
        <View style={styles.chips}>
          <Pressable
            onPress={() => setWalletSel(null)}
            style={[
              styles.chip,
              { backgroundColor: theme.backgroundElement },
              effWallet === null && { backgroundColor: theme.accent },
            ]}>
            <ThemedText style={{ color: effWallet === null ? theme.onAccent : theme.text }}>None</ThemedText>
          </Pressable>
          {walletList.map((w) => (
            <Pressable
              key={w.id}
              onPress={() => setWalletSel(w.id)}
              style={[
                styles.chip,
                { backgroundColor: theme.backgroundElement },
                effWallet === w.id && { backgroundColor: theme.accent },
              ]}>
              <ThemedText style={{ color: effWallet === w.id ? theme.onAccent : theme.text }}>{w.name}</ThemedText>
            </Pressable>
          ))}
        </View>

        <Pressable
          onPress={save}
          disabled={!canSave}
          style={[styles.save, { backgroundColor: theme.accent, opacity: canSave ? 1 : 0.5 }]}>
          <ThemedText style={{ color: theme.onAccent, fontWeight: '700' }}>Record payment</ThemedText>
        </Pressable>
      </ScrollView>
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.two, paddingBottom: Spacing.six },
  summary: { borderRadius: Spacing.three, padding: Spacing.three, gap: 2, marginBottom: Spacing.two },
  amountRow: { flexDirection: 'row', gap: Spacing.two, alignItems: 'center', marginBottom: Spacing.two },
  amount: { flex: 1, borderRadius: Spacing.three, padding: Spacing.three, fontSize: 28, fontWeight: '700' },
  full: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.three, borderRadius: Spacing.three },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginBottom: Spacing.two },
  chip: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: Spacing.four },
  save: { marginTop: Spacing.three, padding: Spacing.three, borderRadius: Spacing.three, alignItems: 'center' },
  empty: { textAlign: 'center', padding: Spacing.four },
})
