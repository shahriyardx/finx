import { Image } from 'expo-image'
import { useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, View } from 'react-native'

import { ThemedText } from '@/components/themed-text'
import { resolveReceipt } from '@/lib/receipt'

export default function ReceiptViewer() {
  const params = useLocalSearchParams<{ uri?: string }>()
  // The receipt path is passed encoded; the router may hand it back still
  // encoded, so decode before use (no-op if already decoded). Then resolve a
  // relative path against the current document directory.
  const stored = params.uri ? decodeURIComponent(params.uri) : undefined
  const uri = stored ? resolveReceipt(stored) : undefined
  const [error, setError] = useState<string | null>(null)

  return (
    <View style={styles.container}>
      {uri ? (
        <Image
          source={{ uri }}
          style={styles.image}
          contentFit="contain"
          onError={(e) => setError(e?.error ?? 'failed to load')}
        />
      ) : null}
      {(!uri || error) && (
        <View style={styles.overlay}>
          <ThemedText type="small" style={styles.text}>
            {!uri ? 'No receipt attached.' : `Could not load image.\n${error}`}
          </ThemedText>
          {uri ? (
            <ThemedText type="small" style={styles.uri}>
              {uri}
            </ThemedText>
          ) : null}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', height: '100%' },
  overlay: { position: 'absolute', padding: 24, alignItems: 'center', gap: 12 },
  text: { color: '#fff', textAlign: 'center' },
  uri: { color: '#9aa', textAlign: 'center' },
})
