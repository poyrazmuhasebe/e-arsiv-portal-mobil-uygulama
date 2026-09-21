import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../../theme';
import Icon, { type IconName } from './Icon';

interface Props {
  label: string;
  /** Gösterilecek hazır metin (ör. "21/09/2026"); boşsa placeholder. */
  value?: string;
  placeholder?: string;
  onPress: () => void;
  disabled?: boolean;
  required?: boolean;
  icon?: IconName;
  error?: boolean;
}

/**
 * Dokununca tarih/saat seçici açan alan. Seçicinin kendisi ve tarih
 * mantığı çağıranda kalır; bu bileşen yalnızca görünümdür (AppInput ile
 * aynı yükseklik ve çerçeve).
 */
export default function DateField({
  label,
  value,
  placeholder = 'Seçiniz',
  onPress,
  disabled,
  required,
  icon = 'calendar-month-outline',
  error,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value || placeholder}`}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        styles.alan,
        error && styles.hata,
        pressed && styles.basili,
        disabled && styles.pasif,
      ]}
    >
      <View style={styles.metinler}>
        <Text style={styles.etiket} numberOfLines={1}>
          {label}
          {required ? ' *' : ''}
        </Text>
        <Text style={[typography.body, !value && styles.yerTutucu]} numberOfLines={1}>
          {value || placeholder}
        </Text>
      </View>
      <Icon name={icon} size={20} color={disabled ? colors.textMuted : colors.primary} />
    </Pressable>
  );
}

export const alanStilleri = StyleSheet.create({
  alan: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 56,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: radius.small,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.backgroundSecondary,
  },
});

const styles = StyleSheet.create({
  alan: alanStilleri.alan,
  hata: { borderColor: colors.danger },
  basili: { borderColor: colors.primary },
  pasif: { backgroundColor: colors.surface, borderColor: colors.border },
  metinler: { flex: 1, minWidth: 0, gap: 2 },
  etiket: { ...typography.caption, color: colors.textSecondary },
  yerTutucu: { color: colors.textMuted },
});
