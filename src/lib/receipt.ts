import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';

/**
 * Let the user pick a receipt photo (from library or camera) and persist a copy
 * into document storage. Returns the saved file uri, or null if cancelled/denied.
 * Unlike avatars, receipts keep their original aspect ratio.
 */
async function persist(asset: ImagePicker.ImagePickerAsset): Promise<string> {
  const dir = `${FileSystem.documentDirectory}receipts/`;
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true }).catch(() => {});
  const ext = asset.uri.split('.').pop()?.split('?')[0] || 'jpg';
  const dest = `${dir}${Date.now()}.${ext}`;
  await FileSystem.copyAsync({ from: asset.uri, to: dest });
  return dest;
}

export async function pickReceiptFromLibrary(): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6 });
  if (res.canceled || !res.assets?.[0]) return null;
  return persist(res.assets[0]);
}

export async function captureReceiptPhoto(): Promise<string | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) return null;
  const res = await ImagePicker.launchCameraAsync({ quality: 0.6 });
  if (res.canceled || !res.assets?.[0]) return null;
  return persist(res.assets[0]);
}
