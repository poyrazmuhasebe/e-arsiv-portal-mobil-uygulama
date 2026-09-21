import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Switch } from 'react-native-paper';

import { colors, radius, spacing, typography } from '../../theme';
import Icon, { type IconName } from './Icon';

interface Props {
  title: string;
  description?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  icon?: IconName;
  disabled?: boolean;
}

/** Başlık + açıklama + anahtar. Satırın tamamı dokunulabilir. */
export default function ToggleRow({ title, description, value, onValueChange, icon, disabled }: Props) {
  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityLabel={title}
      accessibilityState={{ checked: value, disabled: !!disabled }}
      style={styles.satir}
    >
      {icon ? (
        <View style={styles.karo}>
          <Icon name={icon} size={22} color={colors.primary} />
        </View>
      ) : null}
      <View style={styles.metinler}>
        <Text style={[typography.cardTitle, disabled && styles.pasif]}>{title}</Text>
        {description ? <Text style={typography.bodySecondary}>{description}</Text> : null}
      </View>
      <Switch value={value} onValueChange={onValueChange} disabled={disabled} color={colors.primary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  satir: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 56 },
  karo: {
    width: 44,
    height: 44,
    borderRadius: radius.medium,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metinler: { flex: 1, minWidth: 0, gap: 2 },
  pasif: { color: colors.textMuted },
});
