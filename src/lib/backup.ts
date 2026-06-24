import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { exportData, getSetting, setSetting } from '@/db/repo';

const EXPORT_DIR_KEY = 'export_dir'; // remembered SAF folder uri (Android)
const { StorageAccessFramework: SAF } = FileSystem;

export type ExportResult = { method: 'saved' | 'shared'; name: string };

/**
 * Export all data as a plain JSON backup.
 * - Android: save into a folder the user picks once (e.g. Downloads), remembered.
 * - iOS / web: share sheet.
 */
export async function exportBackupFile(): Promise<ExportResult> {
  const data = await exportData();
  const json = JSON.stringify(data, null, 2);
  const iso = new Date(data.exportedAt).toISOString();
  const stamp = `${iso.slice(0, 10)}_${iso.slice(11, 19).replace(/:/g, '-')}`;
  const name = `finx-backup-${stamp}.json`;

  if (Platform.OS === 'android') {
    let dir = await getSetting(EXPORT_DIR_KEY);
    for (let attempt = 0; attempt < 2; attempt++) {
      if (!dir) {
        const perm = await SAF.requestDirectoryPermissionsAsync();
        if (!perm.granted) break;
        dir = perm.directoryUri;
        await setSetting(EXPORT_DIR_KEY, dir);
      }
      try {
        const fileUri = await SAF.createFileAsync(dir, name, 'application/json');
        await FileSystem.writeAsStringAsync(fileUri, json);
        return { method: 'saved', name };
      } catch {
        dir = null; // stale permission — clear and re-prompt
        await setSetting(EXPORT_DIR_KEY, '');
      }
    }
  }

  // iOS / fallback: share from a cache file (new File API).
  const file = new File(FileSystem.cacheDirectory + name);
  if (file.exists) file.delete();
  file.create();
  file.write(json);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/json',
      dialogTitle: 'Export FinX data',
      UTI: 'public.json',
    });
  }
  return { method: 'shared', name };
}

/** Pick a JSON backup and return its parsed contents (null if cancelled). */
export async function pickBackupFile(): Promise<unknown | null> {
  // Keep the original content:// uri — the picker grants this process a read
  // grant on it. Read with the LEGACY reader: the new File API is scope-
  // restricted (esp. in Expo Go) and rejects picker paths with "missing READ".
  const res = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: false });
  if (res.canceled || !res.assets?.[0]) return null;

  const text = await FileSystem.readAsStringAsync(res.assets[0].uri);
  return JSON.parse(text);
}
