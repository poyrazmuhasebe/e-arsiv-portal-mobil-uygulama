import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../../theme';
import Icon, { type IconName } from './Icon';

interface Props {
  icon: IconName;
  title: string;
  description?: string;
  /** Ör. <PrimaryButton>…</PrimaryButton> */
  action?: React.ReactNode;
}

/** Boş liste / sonuç yok durumu: ikon + başlık + açıklama. */
export default function EmptyState({ icon, title, description, action }: Props) {
  return (
    <View style={styles.kap}>
      <View style={styles.karo}>
        <Icon name={icon} size={30} color={colors.primary} />
      </View>
      <Text style={[typography.cardTitle, styles.orta]}>{title}</Text>
      {description ? <Text style={[typography.bodySecondary, styles.orta]}>{description}</Text> : null}
      {action ? <View style={styles.eylem}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  kap: { alignItems: 'center', paddingVertical: spacing.xxl, paddingHorizontal: spacing.lg, gap: spacing.xs },
  karo: {
    width: 64,
    height: 64,
    borderRadius: radius.large,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  orta: { textAlign: 'center', maxWidth: 420 },
  eylem: { marginTop: spacing.sm, alignSelf: 'stretch', maxWidth: 420, width: '100%' },
});
