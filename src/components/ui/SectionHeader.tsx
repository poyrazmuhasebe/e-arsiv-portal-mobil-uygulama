import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../../theme';
import Icon, { type IconName } from './Icon';

interface Props {
  title: string;
  icon?: IconName;
  /** 'overline': ana sayfadaki küçük büyük-harf başlık; 'section': normal bölüm başlığı. */
  variant?: 'overline' | 'section';
  /** Başlığın yanında küçük not (ör. "İsteğe bağlı"). */
  hint?: string;
  right?: React.ReactNode;
  /** Altına ince çizgi. */
  divider?: boolean;
}

export default function SectionHeader({ title, icon, variant = 'section', hint, right, divider }: Props) {
  const overline = variant === 'overline';
  return (
    <View style={[styles.kap, divider && styles.cizgili]} accessibilityRole="header">
      {icon ? <Icon name={icon} size={overline ? 16 : 20} color={overline ? colors.textMuted : colors.primary} /> : null}
      <Text style={[overline ? typography.overline : typography.sectionTitle, styles.baslik]} numberOfLines={2}>
        {title}
      </Text>
      {hint ? <Text style={styles.not}>{hint}</Text> : null}
      {right ? <View style={styles.sag}>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  kap: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: 24 },
  cizgili: { borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: spacing.sm },
  baslik: { flexShrink: 1 },
  not: {
    ...typography.caption,
    color: colors.textMuted,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: spacing.xs,
    paddingVertical: 1,
  },
  sag: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
});
