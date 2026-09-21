import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../../theme';
import AppCard from './AppCard';
import Icon, { type IconName } from './Icon';

type Vurgu = 'primary' | 'danger' | 'info' | 'success' | 'warning';

interface Props {
  icon: IconName;
  title: string;
  description?: string;
  onPress?: () => void;
  accent?: Vurgu;
  /** Sağda ok yerine başka bir öğe (ör. Switch). */
  rightElement?: React.ReactNode;
  disabled?: boolean;
}

const VURGU: Record<Vurgu, { zemin: string; renk: string }> = {
  primary: { zemin: colors.primarySoft, renk: colors.primary },
  danger: { zemin: colors.dangerBackground, renk: colors.danger },
  info: { zemin: colors.infoBackground, renk: colors.info },
  success: { zemin: colors.successBackground, renk: colors.success },
  warning: { zemin: colors.warningBackground, renk: colors.warning },
};

/** Ana sayfadaki gezinme kartları: ikon karosu + başlık + açıklama + ok. */
export default function MenuCard({ icon, title, description, onPress, accent = 'primary', rightElement, disabled }: Props) {
  const v = VURGU[accent];
  return (
    <AppCard onPress={onPress} disabled={disabled} accessibilityLabel={title} style={styles.kart}>
      <View style={[styles.karo, { backgroundColor: v.zemin }]}>
        <Icon name={icon} size={22} color={v.renk} />
      </View>
      <View style={styles.metinler}>
        <Text style={[typography.cardTitle, accent === 'danger' && styles.tehlikeBaslik]} numberOfLines={2}>
          {title}
        </Text>
        {description ? (
          <Text style={typography.bodySecondary} numberOfLines={3}>
            {description}
          </Text>
        ) : null}
      </View>
      {rightElement ?? (onPress ? <Icon name="chevron-right" size={22} color={colors.textMuted} /> : null)}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  kart: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 72 },
  karo: {
    width: 44,
    height: 44,
    borderRadius: radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metinler: { flex: 1, minWidth: 0, gap: 2 },
  tehlikeBaslik: { color: colors.danger },
});
