import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { eq } from 'drizzle-orm'
import { useLiveQuery } from 'drizzle-orm/expo-sqlite'
import * as Contacts from 'expo-contacts/legacy'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native'

import { Avatar } from '@/components/avatar'
import { ThemedText } from '@/components/themed-text'
import { ThemedView } from '@/components/themed-view'
import { Spacing } from '@/constants/theme'
import { db } from '@/db/client'
import { createPerson, updatePerson } from '@/db/repo'
import { persons } from '@/db/schema'
import { useTheme } from '@/hooks/use-theme'
import { pickAvatar } from '@/lib/avatar'

export default function PersonForm() {
  const theme = useTheme()
  const router = useRouter()
  const params = useLocalSearchParams<{ id?: string }>()
  const editId = params.id ? Number(params.id) : null

  const { data } = useLiveQuery(
    editId
      ? db.select().from(persons).where(eq(persons.id, editId))
      : db.select().from(persons).where(eq(persons.id, -1)),
    [editId],
  )

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [note, setNote] = useState('')
  const [avatar, setAvatar] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)

  // Prefill once when editing.
  useEffect(() => {
    if (editId && !loaded && data?.[0]) {
      const p = data[0]
      /* eslint-disable react-hooks/set-state-in-effect */
      setName(p.name)
      setPhone(p.phone ?? '')
      setNote(p.note ?? '')
      setAvatar(p.avatar ?? null)
      setLoaded(true)
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [editId, loaded, data])

  const canSave = name.trim().length > 0 && !saving

  const save = async () => {
    if (!canSave) return
    setSaving(true)
    const fields = {
      name: name.trim(),
      phone: phone.trim() || null,
      note: note.trim() || null,
      avatar,
    }
    if (editId) await updatePerson(editId, fields)
    else await createPerson(fields)
    router.back()
  }

  const pick = async () => {
    const uri = await pickAvatar()
    if (uri) setAvatar(uri)
  }

  const pickFromContacts = async () => {
    const perm = await Contacts.requestPermissionsAsync()
    if (!perm.granted) return
    const contact = await Contacts.presentContactPickerAsync()
    if (!contact) return
    const num = contact.phoneNumbers?.[0]?.number
    if (num) setPhone(num)
    if (!name.trim() && contact.name) setName(contact.name)
  }

  const inputStyle = [styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: editId ? 'Edit person' : 'New person' }} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">
        <View style={styles.avatarRow}>
          <Pressable onPress={pick}>
            <Avatar name={name || '?'} uri={avatar} size={88} />
          </Pressable>
          <Pressable onPress={pick} hitSlop={8}>
            <ThemedText type="link" themeColor="accent">
              {avatar ? 'Change photo' : 'Add photo (optional)'}
            </ThemedText>
          </Pressable>
        </View>

        <ThemedText type="small" themeColor="textSecondary">
          Name
        </ThemedText>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Full name"
          placeholderTextColor={theme.textSecondary}
          style={inputStyle}
          autoFocus={!editId}
        />
        <View style={styles.phoneLabel}>
          <ThemedText type="small" themeColor="textSecondary">
            Phone (optional)
          </ThemedText>
          <Pressable onPress={pickFromContacts} hitSlop={8} style={styles.contactsBtn}>
            <MaterialCommunityIcons name="account-box-outline" size={16} color={theme.accent} />
            <ThemedText type="small" themeColor="accent" style={{ fontWeight: '600' }}>
              From contacts
            </ThemedText>
          </Pressable>
        </View>
        <TextInput
          value={phone}
          onChangeText={setPhone}
          placeholder="Type or pick from contacts"
          placeholderTextColor={theme.textSecondary}
          keyboardType="phone-pad"
          style={inputStyle}
        />
        <ThemedText type="small" themeColor="textSecondary">
          Note (optional)
        </ThemedText>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Note"
          placeholderTextColor={theme.textSecondary}
          style={inputStyle}
        />
        <Pressable
          onPress={save}
          disabled={!canSave}
          style={[styles.save, { backgroundColor: theme.accent, opacity: canSave ? 1 : 0.5 }]}>
          <ThemedText style={{ color: theme.onAccent, fontWeight: '700' }}>
            {editId ? 'Save changes' : 'Save person'}
          </ThemedText>
        </Pressable>
      </ScrollView>
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.two },
  avatarRow: { alignItems: 'center', gap: Spacing.two, marginBottom: Spacing.three },
  phoneLabel: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  contactsBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.half },
  input: { borderRadius: Spacing.three, padding: Spacing.three, fontSize: 16, marginBottom: Spacing.two },
  save: { marginTop: Spacing.four, padding: Spacing.three, borderRadius: Spacing.three, alignItems: 'center' },
})
