import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { createPerson } from '@/db/repo';
import { useTheme } from '@/hooks/use-theme';
import { pickAvatar } from '@/lib/avatar';

export default function PersonForm() {
  const theme = useTheme();
  const router = useRouter();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const canSave = name.trim().length > 0 && !saving;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    await createPerson({
      name: name.trim(),
      phone: phone.trim() || null,
      note: note.trim() || null,
      avatar,
    });
    router.back();
  };

  const pick = async () => {
    const uri = await pickAvatar();
    if (uri) setAvatar(uri);
  };

  const inputStyle = [styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }];

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
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
          autoFocus
        />
        <ThemedText type="small" themeColor="textSecondary">
          Phone (optional)
        </ThemedText>
        <TextInput
          value={phone}
          onChangeText={setPhone}
          placeholder="Phone"
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
          <ThemedText style={{ color: theme.onAccent, fontWeight: '700' }}>Save person</ThemedText>
        </Pressable>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.two },
  avatarRow: { alignItems: 'center', gap: Spacing.two, marginBottom: Spacing.three },
  input: { borderRadius: Spacing.three, padding: Spacing.three, fontSize: 16, marginBottom: Spacing.two },
  save: { marginTop: Spacing.four, padding: Spacing.three, borderRadius: Spacing.three, alignItems: 'center' },
});
