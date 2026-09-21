import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { TOUCH_MIN, colors, spacing, typography } from '../../theme';
import Icon from './Icon';

interface Props {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}

/** "Uyarıyı Okudum", "Kullanıcı Kodunu Hatırla" gibi onay kutusu satırı. */
export default function CheckRow({ label, checked, onChange, disabled }: Props) {
  return (
    <Pressable
      onPress={() => onChange(!checked)}
      disabled={disabled}
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked, disabled: !!disabled }}
      style={styles.satir}
      hitSlop={4}
    >
      <Icon
        name={checked ? 'checkbox-marked' : 'checkbox-blank-outline'}
        size={24}
        color={disabled ? colors.textMuted : checked ? colors.primary : colors.textSecondary}
      />
      <Text style={[typography.body, styles.metin, disabled && styles.pasif]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  satir: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: TOUCH_MIN },
  metin: { flex: 1 },
  pasif: { color: colors.textMuted },
});
