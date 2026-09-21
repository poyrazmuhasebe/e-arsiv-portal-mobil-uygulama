import React from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, spacing } from '../../theme';

type Ton = 'default' | 'primary' | 'danger' | 'warning';

interface Props {
  children: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  accessibilityLabel?: string;
  /** Kenarlık/zemin tonu: yıkıcı eylem uyarıları için 'danger'. */
  tone?: Ton;
  /** Bir kademe açık yüzey (kart içinde kart, dialog). */
  elevated?: boolean;
  /** İç boşluk; varsayılan spacing.md. */
  padded?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Temel kart: yüzey rengi + ince kenarlık + büyük köşe. Ayrım gölgeyle değil
 * yüzey farkı ve kenarlıkla yapılır. `onPress` verilirse dokunulabilir olur.
 */
export default function AppCard({
  children,
  onPress,
  onLongPress,
  accessibilityLabel,
  tone = 'default',
  elevated,
  padded = true,
  disabled,
  style,
}: Props) {
  const gorunum = [
    styles.kart,
    elevated && styles.yukseltilmis,
    tone === 'primary' && styles.birincil,
    tone === 'danger' && styles.tehlike,
    tone === 'warning' && styles.uyari,
    padded && styles.bosluklu,
    style,
  ];
  if (!onPress && !onLongPress) return <View style={gorunum}>{children}</View>;
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
      android_ripple={{ color: colors.primarySoft }}
      style={({ pressed }) => [...gorunum, pressed && styles.basili]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  kart: {
    backgroundColor: colors.surface,
    borderRadius: radius.large,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  bosluklu: { padding: spacing.md },
  yukseltilmis: { backgroundColor: colors.surfaceElevated },
  birincil: { borderColor: colors.primaryBorder },
  tehlike: { borderColor: colors.dangerBorder, backgroundColor: colors.dangerBackground },
  uyari: { borderColor: colors.warningBorder, backgroundColor: colors.warningBackground },
  basili: { backgroundColor: colors.surfaceElevated },
});
