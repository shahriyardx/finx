import { useLiveQuery } from 'drizzle-orm/expo-sqlite'
import { useRouter } from 'expo-router'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Avatar } from '@/components/avatar'
import { EmptyState } from '@/components/empty-state'
import { Money } from '@/components/money'
import { ThemedText } from '@/components/themed-text'
import { ThemedView } from '@/components/themed-view'
import { Spacing } from '@/constants/theme'
import { db } from '@/db/client'
import { debts, persons } from '@/db/schema'
import { useTheme } from '@/hooks/use-theme'

export default function PeopleScreen() {
  const theme = useTheme()
  const router = useRouter()
  const { data: personRows } = useLiveQuery(db.select().from(persons))
  const { data: debtRows } = useLiveQuery(db.select().from(debts))

  // Net per person: +ve = they owe you, -ve = you owe them.
  const netByPerson = new Map<number, number>()
  for (const d of debtRows ?? []) {
    if (d.status !== 'open') continue
    const sign = d.type === 'lend' ? 1 : -1
    netByPerson.set(d.personId, (netByPerson.get(d.personId) ?? 0) + sign * d.outstanding)
  }

  const list = personRows ?? []

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <SafeAreaView edges={['top']} style={styles.body}>
          <View style={styles.head}>
            <ThemedText type="subtitle">People</ThemedText>
            <Pressable
              onPress={() => router.push('/modals/person-form')}
              style={[styles.add, { backgroundColor: theme.accent }]}>
              <ThemedText style={{ color: theme.onAccent, fontWeight: '700' }}>+ Add</ThemedText>
            </Pressable>
          </View>

          {list.length === 0 ? (
            <EmptyState
              icon="account-group"
              title="No people yet"
              message="Add people to track money you lend to or borrow from them."
              actionLabel="Add person"
              onAction={() => router.push('/modals/person-form')}
            />
          ) : (
            <View style={styles.list}>
              {list.map((p) => {
                const net = netByPerson.get(p.id) ?? 0
                return (
                  <Pressable
                    key={p.id}
                    onPress={() => router.push(`/person/${p.id}`)}
                    style={({ pressed }) => [
                      styles.row,
                      { backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement },
                    ]}>
                    <Avatar name={p.name} uri={p.avatar} />
                    <View style={styles.middle}>
                      <ThemedText type="default">{p.name}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {net === 0 ? 'Settled' : net > 0 ? 'Owes you' : 'You owe'}
                      </ThemedText>
                    </View>
                    <Money value={net} signed={net !== 0} type="smallBold" />
                  </Pressable>
                )
              })}
            </View>
          )}
        </SafeAreaView>
      </ScrollView>
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.three, paddingBottom: Spacing.six },
  body: { gap: Spacing.three },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  add: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: Spacing.three },
  list: { gap: Spacing.two, marginTop: Spacing.two },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  middle: { flex: 1, gap: 2 },
})
