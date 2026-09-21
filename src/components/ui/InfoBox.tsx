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

/**
 * Çocuklar yalnızca metin/sayıdan oluşuyorsa (ör. `Kalan {n} deneme` — JSX
 * bunu diziye çevirir) tek bir <Text> içine alınır; aksi hâlde React Native
 * "Text strings must be rendered within <Text>" hatasıyla çöker. Öğe
 * (element) içeren çocuklar olduğu gibi çizilir.
 */
function metinMi(children: React.ReactNode): boolean {
  return React.Children.toArray(children).every((c) => typeof c === 'string' || typeof c === 'number');
}

/** GİB sınırları, güvenlik notları, uyarılar için açıklama kutusu. */
export default function InfoBox({ tone = 'info', title, icon, children }: Props) {
  const t = TON[tone];
  return (
    <View style={[styles.kutu, { backgroundColor: t.zemin, borderColor: t.kenar }]}>
      <Icon name={icon ?? t.ikon} size={20} color={t.renk} />
      <View style={styles.metinler}>
        {title ? <Text style={[typography.cardTitle, styles.baslik, { color: t.renk }]}>{title}</Text> : null}
        {metinMi(children) ? (
          <Text style={styles.metin}>{children}</Text>
        ) : (
          // Karışık içerikte başıboş metin parçaları da ayrı ayrı sarılır.
          React.Children.map(children, (c) =>
            typeof c === 'string' || typeof c === 'number' ? <Text style={styles.metin}>{c}</Text> : c,
          )
        )}
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
