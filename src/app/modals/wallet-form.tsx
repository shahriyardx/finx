import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { eq } from 'drizzle-orm'
import { useLiveQuery } from 'drizzle-orm/expo-sqlite'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native'

import { ColorPicker } from '@/components/color-picker'
import { ThemedText } from '@/components/themed-text'
import { ThemedView } from '@/components/themed-view'
import { WalletIconBadge } from '@/components/wallet-icon-badge'
import { Spacing } from '@/constants/theme'
import { db } from '@/db/client'
import { createWallet, updateWallet } from '@/db/repo'
import { wallets } from '@/db/schema'
import { useTheme } from '@/hooks/use-theme'
import { BANKS } from '@/lib/banks'
import { WALLET_COLORS, WALLET_ICONS, type WalletIconName } from '@/lib/categories'
import { parseMoney } from '@/lib/format'

export default function WalletFormScreen() {
  const theme = useTheme()
  const router = useRouter()
  const params = useLocalSearchParams<{ id?: string }>()
  const editId = params.id ? Number(params.id) : null

  const { data } = useLiveQuery(
    db
      .select()
      .from(wallets)
      .where(eq(wallets.id, editId ?? -1)),
    [editId],
  )

  const [name, setName] = useState('')
  const [opening, setOpening] = useState('')
  const [color, setColor] = useState<string>(WALLET_COLORS[0])
  const [icon, setIcon] = useState<WalletIconName>(WALLET_ICONS[0])
  const [smsSender, setSmsSender] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  // Live value while dragging in the picker; committed to `color` on Done.
  const [draftColor, setDraftColor] = useState<string>(color)

  const isCustom = !WALLET_COLORS.includes(color)

  useEffect(() => {
    if (editId && !loaded && data?.[0]) {
      const w = data[0]
      /* eslint-disable react-hooks/set-state-in-effect */
      setName(w.name)
      setColor(w.color)
      setIcon(w.icon as WalletIconName)
      setSmsSender(w.smsSender ?? null)
      setLoaded(true)
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [editId, loaded, data])

  const canSave = name.trim().length > 0 && !saving

  const save = async () => {
    if (!canSave) return
    setSaving(true)
    if (editId) {
      await updateWallet(editId, { name: name.trim(), color, icon, smsSender })
    } else {
      await createWallet({ name: name.trim(), color, icon, opening: parseMoney(opening), smsSender })
    }
    router.back()
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: editId ? 'Edit wallet' : 'New wallet' }} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">
        <ThemedText type="small" themeColor="textSecondary">
          Name
        </ThemedText>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. Cash, Bank"
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
          autoFocus={!editId}
        />

        {editId ? null : (
          <>
            <ThemedText type="small" themeColor="textSecondary">
              Opening balance
            </ThemedText>
            <TextInput
              value={opening}
              onChangeText={setOpening}
              placeholder="0.00"
              placeholderTextColor={theme.textSecondary}
              keyboardType="decimal-pad"
              style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
            />
          </>
        )}

        <ThemedText type="small" themeColor="textSecondary">
          Color
        </ThemedText>
        <View style={styles.colors}>
          {/* Rainbow disk → custom color picker */}
          <Pressable
            onPress={() => {
              setDraftColor(color)
              setPickerOpen(true)
            }}
            style={[
              styles.swatch,
              styles.disk,
              isCustom && { backgroundColor: color, borderColor: theme.text, borderWidth: 3 },
            ]}>
            <MaterialCommunityIcons name="palette" size={22} color={isCustom ? '#ffffff' : theme.text} />
          </Pressable>
          {WALLET_COLORS.map((c) => (
            <Pressable
              key={c}
              onPress={() => setColor(c)}
              style={[
                styles.swatch,
                { backgroundColor: c },
                color === c && { borderColor: theme.text, borderWidth: 3 },
              ]}
            />
          ))}
        </View>

        <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
          <Pressable style={styles.pickerBackdrop} onPress={() => setPickerOpen(false)}>
            <Pressable style={[styles.pickerCard, { backgroundColor: theme.background }]} onPress={() => {}}>
              <ColorPicker value={draftColor} onChange={setDraftColor} />
              <View style={styles.pickerActions}>
                <Pressable onPress={() => setPickerOpen(false)} style={styles.pickerBtn}>
                  <ThemedText themeColor="textSecondary" style={{ fontWeight: '600' }}>
                    Cancel
                  </ThemedText>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setColor(draftColor)
                    setPickerOpen(false)
                  }}
                  style={[styles.pickerBtn, { backgroundColor: theme.accent, borderRadius: Spacing.three }]}>
                  <ThemedText style={{ color: theme.onAccent, fontWeight: '700' }}>Use color</ThemedText>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        <ThemedText type="small" themeColor="textSecondary">
          Icon
        </ThemedText>
        <View style={styles.icons}>
          {WALLET_ICONS.map((ic) => (
            <Pressable
              key={ic}
              onPress={() => setIcon(ic)}
              style={[styles.iconWrap, icon === ic && { borderColor: theme.accent, borderWidth: 3 }]}>
              <WalletIconBadge name={ic} color={color} size={44} />
            </Pressable>
          ))}
        </View>

        <ThemedText type="small" themeColor="textSecondary">
          Auto-import SMS from
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
          Transactions from this bank’s SMS are added to this wallet automatically (Android).
        </ThemedText>
        <View style={styles.chips}>
          {[{ id: null, label: 'None', supported: true }, ...BANKS].map((b) => {
            const active = smsSender === b.id
            return (
              <Pressable
                key={b.id ?? 'none'}
                onPress={() => setSmsSender(b.id)}
                style={[
                  styles.chip,
                  { backgroundColor: theme.backgroundElement },
                  active && { backgroundColor: theme.accent },
                ]}>
                <ThemedText style={{ color: active ? theme.onAccent : theme.text }}>
                  {b.label}
                  {b.supported ? '' : ' (soon)'}
                </ThemedText>
              </Pressable>
            )
          })}
        </View>

        <Pressable
          onPress={save}
          disabled={!canSave}
          style={[styles.save, { backgroundColor: theme.accent, opacity: canSave ? 1 : 0.5 }]}>
          <ThemedText style={{ color: theme.onAccent, fontWeight: '700' }}>
            {editId ? 'Save changes' : 'Save wallet'}
          </ThemedText>
        </Pressable>
      </ScrollView>
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.two },
  input: { borderRadius: Spacing.three, padding: Spacing.three, fontSize: 16, marginBottom: Spacing.two },
  colors: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginVertical: Spacing.two },
  swatch: { width: 40, height: 40, borderRadius: 20 },
  disk: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#9333EA',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  pickerBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: Spacing.four },
  pickerCard: { borderRadius: Spacing.four, padding: Spacing.four, gap: Spacing.three },
  pickerActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.two, marginTop: Spacing.two },
  pickerBtn: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icons: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginVertical: Spacing.two },
  iconWrap: { borderRadius: 18, borderWidth: 3, borderColor: 'transparent', padding: 2 },
  hint: { marginBottom: Spacing.one },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginVertical: Spacing.two },
  chip: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: Spacing.four },
  save: { marginTop: Spacing.four, padding: Spacing.three, borderRadius: Spacing.three, alignItems: 'center' },
})
