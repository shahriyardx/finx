import { useMemo, useState } from 'react';
import { type LayoutChangeEvent, PanResponder, StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';

/* ------------------------------------------------------------------ *
 * HSL <-> hex. Plain JS (no worklets) so this works on any runtime.
 * ------------------------------------------------------------------ */
function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function hslToHex(h: number, s: number, l: number): string {
  const sat = s / 100;
  const lit = l / 100;
  const a = sat * Math.min(lit, 1 - lit);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const c = lit - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
    return Math.round(255 * c)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return { h: 150, s: 80, l: 45 };
  const n = parseInt(m[1], 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  let s = 0;
  if (d) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}

/** A draggable color band built from solid strips (no gradient lib needed). */
function Track({
  value,
  max,
  colors,
  onChange,
}: {
  value: number;
  max: number;
  colors: string[];
  onChange: (v: number) => void;
}) {
  const [width, setWidth] = useState(0);
  const handle = (x: number) => {
    if (width > 0) onChange(clamp(x / width, 0, 1) * max);
  };
  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e) => handle(e.nativeEvent.locationX),
        onPanResponderMove: (e) => handle(e.nativeEvent.locationX),
      }),
    // handle closes over the latest width/max/onChange.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [width, max, onChange],
  );
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  return (
    <View style={styles.track} onLayout={onLayout} {...pan.panHandlers}>
      <View style={styles.strips} pointerEvents="none">
        {colors.map((c, i) => (
          <View key={i} style={[styles.strip, { backgroundColor: c }]} />
        ))}
      </View>
      <View pointerEvents="none" style={[styles.thumb, { left: `${(value / max) * 100}%` }]} />
    </View>
  );
}

type Props = { value: string; onChange: (hex: string) => void };

export function ColorPicker({ value, onChange }: Props) {
  const [hsl, setHsl] = useState(() => hexToHsl(value));
  const update = (partial: Partial<typeof hsl>) => {
    const next = { ...hsl, ...partial };
    setHsl(next);
    onChange(hslToHex(next.h, next.s, next.l));
  };

  const N = 30;
  const hueColors = Array.from({ length: N }, (_, i) => hslToHex((i / (N - 1)) * 360, 100, 50));
  const satColors = Array.from({ length: N }, (_, i) => hslToHex(hsl.h, (i / (N - 1)) * 100, hsl.l));
  const litColors = Array.from({ length: N }, (_, i) => hslToHex(hsl.h, hsl.s, (i / (N - 1)) * 100));

  return (
    <View style={styles.container}>
      <View style={[styles.preview, { backgroundColor: hslToHex(hsl.h, hsl.s, hsl.l) }]} />
      <Track value={hsl.h} max={360} colors={hueColors} onChange={(h) => update({ h: Math.round(h) })} />
      <Track value={hsl.s} max={100} colors={satColors} onChange={(s) => update({ s: Math.round(s) })} />
      <Track value={hsl.l} max={100} colors={litColors} onChange={(l) => update({ l: Math.round(l) })} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.three },
  preview: { height: 56, borderRadius: Spacing.three },
  track: { height: 32, borderRadius: 16, overflow: 'hidden', justifyContent: 'center' },
  strips: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, flexDirection: 'row' },
  strip: { flex: 1 },
  thumb: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    marginLeft: -11,
    borderWidth: 3,
    borderColor: '#ffffff',
    backgroundColor: 'transparent',
  },
});
