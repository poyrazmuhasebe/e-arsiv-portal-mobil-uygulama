import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { TOUCH_MIN, colors, radius } from '../../theme';
import Icon, { type IconName } from './Icon';

type Varyant = 'ghost' | 'filled' | 'danger';

interface Props {
  icon: IconName;
  onPress: () => void;
  /** Zorunlu: ikon düğmelerinin görünür yazısı yok. */
  accessibilityLabel: string;
  variant?: Varyant;
  disabled?: boolean;
  loading?: boolean;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Başlıktaki ve kartlardaki küçük ikon düğmeleri (geri, ekle, yenile,
 * paylaş, ayarlar…). 44×44 dokunma alanı, yuvarlatılmış kare.
 */
export default function AppIconButton({
  icon,
  onPress,
  accessibilityLabel,
  variant = 'ghost',
  disabled,
  loading,
  size = 22,
  style,
}: Props) {
  const renk = variant === 'danger' ? colors.danger : colors.textPrimary;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!(disabled || loading), busy: !!loading }}
      hitSlop={4}
      android_ripple={{ color: colors.primarySoft, borderless: false }}
      style={({ pressed }) => [
        styles.dugme,
        variant === 'filled' && styles.dolu,
        variant === 'danger' && styles.tehlike,
        pressed && styles.basili,
        disabled && styles.pasif,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : (
        <Icon name={icon} size={size} color={disabled ? colors.textMuted : renk} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  dugme: {
    width: TOUCH_MIN,
    height: TOUCH_MIN,
    borderRadius: radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  dolu: { backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border },
  tehlike: { backgroundColor: colors.dangerBackground },
  basili: { backgroundColor: colors.surfaceSoft },
  pasif: { opacity: 0.6 },
});
