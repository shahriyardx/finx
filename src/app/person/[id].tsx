import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { desc, eq } from 'drizzle-orm'
import { useLiveQuery } from 'drizzle-orm/expo-sqlite'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'

import { Avatar } from '@/components/avatar'
import { useConfirm } from '@/components/confirm-dialog'
import { Money } from '@/components/money'
import { ThemedText } from '@/components/themed-text'
import { ThemedView } from '@/components/themed-view'
import { Spacing } from '@/constants/theme'
import { db } from '@/db/client'
import { deletePerson } from '@/db/repo'
import { debts, persons } from '@/db/schema'
import { useTheme } from '@/hooks/use-theme'
import { formatDate } from '@/lib/format'

export default function PersonDetail() {
  const theme = useTheme()
  const router = useRouter()
  const confirm = useConfirm()
  const { id } = useLocalSearchParams<{ id: string }>()
  const personId = Number(id)

  const { data: personRows } = useLiveQuery(db.select().from(persons).where(eq(persons.id, personId)), [personId])
  const { data: debtRows } = useLiveQuery(
    db.select().from(debts).where(eq(debts.personId, personId)).orderBy(desc(debts.date)),
    [personId],
  )
  const person = personRows?.[0]
  const list = debtRows ?? []
  const net = list
    .filter((d) => d.status === 'open')
    .reduce((s, d) => s + (d.type === 'lend' ? d.outstanding : -d.outstanding), 0)

  const confirmDeletePerson = async () => {
    if (await confirm({ title: 'Delete person', message: 'Removes this person and all their debts.' })) {
      await deletePerson(personId)
      router.back()
    }
  }

  if (!person) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={styles.empty}>Person not found.</ThemedText>
      </ThemedView>
    )
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          title: person.name,
          headerRight: () => (
            <Pressable onPress={() => router.push(`/modals/person-form?id=${personId}`)} hitSlop={10}>
              <MaterialCommunityIcons name="pencil" size={22} color={theme.accent} />
            </Pressable>
          ),
        }}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.hero, { backgroundColor: theme.hero }]}>
          <View style={styles.heroTop}>
            <Avatar name={person.name} uri={person.avatar} size={56} />
            <View style={styles.flex}>
              <ThemedText type="default" style={{ color: theme.heroText }}>
                {person.name}
              </ThemedText>
              {person.phone ? (
                <ThemedText type="small" style={{ color: theme.heroAccent }}>
                  {person.phone}
                </ThemedText>
              ) : null}
            </View>
          </View>
          <ThemedText type="small" style={{ color: theme.heroAccent }}>
            {net === 0 ? 'Settled' : net > 0 ? 'Owes you' : 'You owe'}
          </ThemedText>
          <Money value={Math.abs(net)} themeColor="heroText" style={styles.heroAmount} />
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={() => router.push(`/modals/debt-form?personId=${personId}`)}
            style={[styles.action, { backgroundColor: theme.accent }]}>
            <ThemedText style={{ color: theme.onAccent, fontWeight: '700' }}>+ Lend / Borrow</ThemedText>
          </Pressable>
          <Pressable
            onPress={confirmDeletePerson}
            style={[styles.action, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText style={{ color: theme.expense, fontWeight: '700' }}>Delete</ThemedText>
          </Pressable>
        </View>

        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Debts
        </ThemedText>
        {list.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
            No debts recorded with {person.name}.
          </ThemedText>
        ) : (
          <View style={styles.list}>
            {list.map((d) => (
              <Pressable
                key={d.id}
                onPress={() => router.push(`/debt/${d.id}`)}
                style={({ pressed }) => [
                  styles.debt,
                  { backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement },
                ]}>
                <View style={styles.debtTop}>
                  <ThemedText type="default">
                    {d.type === 'lend' ? 'Lent' : 'Borrowed'}
                    {d.note ? ` · ${d.note}` : ''}
                  </ThemedText>
                  <Money value={d.type === 'lend' ? d.outstanding : -d.outstanding} signed type="smallBold" />
                </View>
                <ThemedText type="small" themeColor="textSecondary">
                  {formatDate(d.date)} · {d.status === 'settled' ? 'Settled' : 'Open'} · tap for details
                </ThemedText>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six },
  hero: { borderRadius: Spacing.four, padding: Spacing.four, gap: Spacing.one },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, marginBottom: Spacing.two },
  flex: { flex: 1, gap: 2 },
  heroAmount: { fontSize: 36, fontWeight: '700', lineHeight: 42 },
  actions: { flexDirection: 'row', gap: Spacing.three },
  action: { flex: 1, paddingVertical: Spacing.three, borderRadius: Spacing.three, alignItems: 'center' },
  sectionTitle: { fontSize: 24, lineHeight: 30, marginTop: Spacing.two },
  list: { gap: Spacing.two },
  debt: { borderRadius: Spacing.three, padding: Spacing.three, gap: Spacing.one },
  debtTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  empty: { paddingVertical: Spacing.four, textAlign: 'center' },
})
