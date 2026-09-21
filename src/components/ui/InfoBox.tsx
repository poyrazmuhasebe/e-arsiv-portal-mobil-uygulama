import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../../theme';
import Icon, { type IconName } from './Icon';

type Ton = 'info' | 'warning' | 'danger' | 'success' | 'neutral' | 'primary';

const TON: Record<Ton, { zemin: string; kenar: string; renk: string; ikon: IconName }> = {
  info: { zemin: colors.infoBackground, kenar: colors.infoBorder, renk: colors.info, ikon: 'information-outline' },
  warning: { zemin: colors.warningBackground, kenar: colors.warningBorder, renk: colors.warning, ikon: 'alert-outline' },
  danger: { zemin: colors.dangerBackground, kenar: colors.dangerBorder, renk: colors.danger, ikon: 'alert-octagon-outline' },
  success: { zemin: colors.successBackground, kenar: colors.successBorder, renk: colors.success, ikon: 'check-circle-outline' },
  neutral: { zemin: colors.surfaceElevated, kenar: colors.border, renk: colors.textSecondary, ikon: 'information-outline' },
  primary: { zemin: colors.primarySoft, kenar: colors.primaryBorder, renk: colors.primary, ikon: 'shield-check-outline' },
};

interface Props {
  tone?: Ton;
  title?: string;
  icon?: IconName;
  /** Metin ya da özel içerik. */
  children: React.ReactNode;
}

/** GİB sınırları, güvenlik notları, uyarılar için açıklama kutusu. */
export default function InfoBox({ tone = 'info', title, icon, children }: Props) {
  const t = TON[tone];
  return (
    <View style={[styles.kutu, { backgroundColor: t.zemin, borderColor: t.kenar }]}>
      <Icon name={icon ?? t.ikon} size={20} color={t.renk} />
      <View style={styles.metinler}>
        {title ? <Text style={[typography.cardTitle, styles.baslik, { color: t.renk }]}>{title}</Text> : null}
        {typeof children === 'string' ? <Text style={styles.metin}>{children}</Text> : children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  kutu: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.sm + 2,
    borderRadius: radius.medium,
    borderWidth: 1,
  },
  metinler: { flex: 1, minWidth: 0, gap: 4 },
  baslik: { fontSize: 15 },
  metin: { ...typography.bodySecondary, color: colors.textSecondary },
});
