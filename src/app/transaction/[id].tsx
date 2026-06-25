import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { eq } from 'drizzle-orm'
import { useLiveQuery } from 'drizzle-orm/expo-sqlite'
import { Image } from 'expo-image'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'

import { useConfirm } from '@/components/confirm-dialog'
import { Money } from '@/components/money'
import { ThemedText } from '@/components/themed-text'
import { ThemedView } from '@/components/themed-view'
import { Spacing } from '@/constants/theme'
import { db } from '@/db/client'
import { deleteTransaction } from '@/db/repo'
import { transactions, wallets } from '@/db/schema'
import { useTheme } from '@/hooks/use-theme'
import { categoryLabel } from '@/lib/categories'
import { formatDate } from '@/lib/format'
import { resolveReceipt } from '@/lib/receipt'

export default function TransactionDetail() {
  const theme = useTheme()
  const router = useRouter()
  const confirm = useConfirm()
  const { id } = useLocalSearchParams<{ id: string }>()
  const txId = Number(id)

  const { data: rows } = useLiveQuery(db.select().from(transactions).where(eq(transactions.id, txId)), [txId])
  const { data: walletRows } = useLiveQuery(db.select().from(wallets))
  const tx = rows?.[0]
  const wallet = walletRows?.find((w) => w.id === tx?.walletId)

  const confirmDelete = async () => {
    if (await confirm({ title: 'Delete transaction', message: 'This reverses its effect on the wallet balance.' })) {
      await deleteTransaction(txId)
      router.back()
    }
  }

  if (!tx) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ title: 'Transaction' }} />
        <ThemedText style={styles.empty}>Transaction not found.</ThemedText>
      </ThemedView>
    )
  }

  const signed = tx.type === 'income' ? tx.amount : -tx.amount

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Transaction',
          headerRight: () => (
            <Pressable onPress={() => router.push(`/modals/transaction-form?id=${txId}`)} hitSlop={10}>
              <MaterialCommunityIcons name="pencil" size={22} color={theme.accent} />
            </Pressable>
          ),
        }}
      />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.amountBlock}>
          <Money value={signed} signed showPlus style={styles.amount} />
          <ThemedText type="small" themeColor="textSecondary">
            {tx.type === 'income' ? 'Income' : 'Expense'}
          </ThemedText>
        </View>

        <ThemedView type="backgroundElement" style={styles.card}>
          <Field label="Wallet" value={wallet?.name ?? '—'} />
          <Field label="Category" value={categoryLabel(tx.category)} />
          <Field label="Date" value={formatDate(tx.date)} />
          {tx.note?.trim() ? <Field label="Note" value={tx.note.trim()} /> : null}
        </ThemedView>

        {tx.smsBody?.trim() ? (
          <>
            <ThemedText type="small" themeColor="textSecondary" style={styles.receiptLabel}>
              Original SMS
            </ThemedText>
            <ThemedView type="backgroundElement" style={styles.smsCard}>
              <ThemedText type="small" style={styles.smsText}>
                {tx.smsBody.trim()}
              </ThemedText>
            </ThemedView>
          </>
        ) : null}

        {tx.receipt ? (
          <>
            <ThemedText type="small" themeColor="textSecondary" style={styles.receiptLabel}>
              Receipt
            </ThemedText>
            <Pressable onPress={() => router.push(`/modals/receipt?uri=${encodeURIComponent(tx.receipt!)}`)}>
              <Image source={{ uri: resolveReceipt(tx.receipt) }} style={styles.receipt} contentFit="cover" />
            </Pressable>
          </>
        ) : null}

        <Pressable
          onPress={() => router.push(`/modals/transaction-form?id=${txId}`)}
          style={[styles.editBtn, { backgroundColor: theme.accent }]}>
          <MaterialCommunityIcons name="pencil" size={18} color={theme.onAccent} />
          <ThemedText style={{ color: theme.onAccent, fontWeight: '700' }}>Edit</ThemedText>
        </Pressable>

        <Pressable onPress={confirmDelete} style={styles.deleteBtn} hitSlop={8}>
          <MaterialCommunityIcons name="trash-can-outline" size={18} color={theme.expense} />
          <ThemedText type="small" style={{ color: theme.expense, fontWeight: '600' }}>
            Delete transaction
          </ThemedText>
        </Pressable>
      </ScrollView>
    </ThemedView>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.field}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="default" style={styles.fieldValue}>
        {value}
      </ThemedText>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six },
  amountBlock: { alignItems: 'center', gap: Spacing.one, paddingVertical: Spacing.three },
  amount: { fontSize: 36, lineHeight: 46, fontWeight: '800' },
  card: { borderRadius: Spacing.three, paddingHorizontal: Spacing.three },
  field: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
  },
  fieldValue: { flexShrink: 1, textAlign: 'right' },
  receiptLabel: { marginTop: Spacing.one },
  smsCard: { borderRadius: Spacing.three, padding: Spacing.three },
  smsText: { lineHeight: 20 },
  receipt: { width: '100%', height: 220, borderRadius: Spacing.three },
  editBtn: {
    marginTop: Spacing.two,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  empty: { textAlign: 'center', paddingVertical: Spacing.four },
})
