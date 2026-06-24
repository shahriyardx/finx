import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  name: string;
  uri?: string | null;
  size?: number;
  color?: string;
};

/** Person avatar: photo when available, else colored circle with first letter. */
export function Avatar({ name, uri, size = 44, color }: Props) {
  const theme = useTheme();
  const radius = size / 2;

  if (uri) {
    return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: radius }} contentFit="cover" />;
  }

  return (
    <View
      style={[
        styles.fallback,
        { width: size, height: size, borderRadius: radius, backgroundColor: color ?? theme.accent },
      ]}>
      <ThemedText style={{ color: theme.onAccent, fontSize: size * 0.42, fontWeight: '700' }}>
        {name.trim().charAt(0).toUpperCase() || '?'}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { alignItems: 'center', justifyContent: 'center' },
});
