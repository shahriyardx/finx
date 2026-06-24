import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';

export default function ReceiptViewer() {
  const { uri } = useLocalSearchParams<{ uri?: string }>();

  return (
    <View style={styles.container}>
      {uri ? (
        <Image source={{ uri }} style={styles.image} contentFit="contain" />
      ) : (
        <ThemedText type="small" style={styles.empty}>
          No receipt attached.
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', height: '100%' },
  empty: { color: '#fff', textAlign: 'center' },
});
