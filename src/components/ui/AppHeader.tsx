import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../../theme';
import AppIconButton from './AppIconButton';

interface Props {
  title: string;
  /** Başlığın altında küçük açıklama. */
  subtitle?: string;
  /** Başlığın üstünde küçük büyük-harf etiket (ör. "HOŞ GELDİNİZ"). */
  eyebrow?: string;
  /** Verilirse solda geri düğmesi çıkar. */
  onBack?: () => void;
  backDisabled?: boolean;
  /** Sağdaki ikon düğmeleri (AppIconButton). */
  right?: React.ReactNode;
  /** Ana sayfa gibi büyük başlık. */
  large?: boolean;
}

/**
 * Tüm ekranların ortak başlığı. Ayarlar/çıkış gibi eylemler başlığın sağında
 * küçük ikon düğmeleri olarak durur (yüzen düğme yok).
 */
export default function AppHeader({ title, subtitle, eyebrow, onBack, backDisabled, right, large }: Props) {
  return (
    <View style={[styles.kap, large && styles.kapBuyuk]} accessibilityRole="header">
      {onBack && (
        <AppIconButton icon="arrow-left" onPress={onBack} disabled={backDisabled} accessibilityLabel="Geri" />
      )}
      <View style={[styles.metinler, !onBack && styles.metinlerGerisiz]}>
        {eyebrow ? (
          <Text style={typography.overline} numberOfLines={1}>
            {eyebrow}
          </Text>
        ) : null}
        <Text
          style={large ? styles.baslikBuyuk : typography.headerTitle}
          numberOfLines={large ? 2 : 1}
          ellipsizeMode="tail"
        >
          {title}
        </Text>
        {subtitle ? (
          <Text style={typography.caption} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ? <View style={styles.sag}>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  kap: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 60,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
    gap: spacing.xxs,
  },
  kapBuyuk: { paddingHorizontal: spacing.screen, paddingTop: spacing.md, paddingBottom: spacing.sm },
  metinler: { flex: 1, minWidth: 0, gap: 2 },
  metinlerGerisiz: { paddingLeft: spacing.xs },
  baslikBuyuk: { ...typography.screenTitle, fontSize: 26, lineHeight: 32 },
  sag: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
});
