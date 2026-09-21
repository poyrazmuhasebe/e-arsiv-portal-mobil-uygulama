import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { spacing } from '../../theme';
import AppCard from './AppCard';
import type { IconName } from './Icon';
import SectionHeader from './SectionHeader';

interface Props {
  title: string;
  icon?: IconName;
  /** "İsteğe bağlı" etiketi gösterilir. */
  optional?: boolean;
  right?: React.ReactNode;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Uzun formların bölümleri (Fatura Bilgileri, Alıcı Bilgileri, Kimlik
 * Bilgileri…): başlıklı kart, içindeki alanlar arasında tutarlı boşluk.
 */
export default function SectionCard({ title, icon, optional, right, children, style }: Props) {
  return (
    <AppCard style={style}>
      <SectionHeader title={title} icon={icon} hint={optional ? 'İsteğe bağlı' : undefined} right={right} divider />
      <View style={styles.icerik}>{children}</View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  icerik: { gap: spacing.sm, paddingTop: spacing.sm },
});
