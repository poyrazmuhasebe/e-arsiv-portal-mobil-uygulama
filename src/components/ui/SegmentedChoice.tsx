import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { TOUCH_MIN, colors, radius, spacing, typography } from '../../theme';

interface Secenek {
  value: string;
  label: string;
}

interface Props {
  options: Secenek[];
  value: string;
  onChange: (value: string) => void;
  /** Grubun ekran okuyucu adı (ör. "KDV Oranı"). */
  accessibilityLabel: string;
  disabled?: boolean;
}

/**
 * Az sayıda kısa seçenek için yan yana seçim (ör. KDV %0 / %1 / %10 / %20).
 * Seçenekler genişliği EŞİT paylaşır (flex: 1, minWidth: 0), bu yüzden dar
 * ekranda ve kart içinde taşmaz; Paper SegmentedButtons sabit iç boşlukla
 * taşıyordu.
 */
export default function SegmentedChoice({ options, value, onChange, accessibilityLabel, disabled }: Props) {
  return (
    <View style={styles.satir} accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel}>
      {options.map((o) => {
        const secili = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            disabled={disabled}
            accessibilityRole="radio"
            accessibilityLabel={o.label}
            accessibilityState={{ checked: secili, disabled: !!disabled }}
            android_ripple={{ color: colors.primarySoft }}
            style={[styles.secenek, secili && styles.secili, disabled && styles.pasif]}
          >
            <Text
              style={[styles.yazi, secili && styles.seciliYazi, disabled && styles.pasifYazi]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  satir: { flexDirection: 'row', gap: spacing.xs },
  secenek: {
    flex: 1,
    minWidth: 0,
    minHeight: TOUCH_MIN,
    borderRadius: radius.small,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxs,
    overflow: 'hidden',
  },
  secili: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  pasif: { borderColor: colors.border },
  yazi: { ...typography.button, fontSize: 14, color: colors.textSecondary },
  seciliYazi: { color: colors.primary, fontWeight: '700' },
  pasifYazi: { color: colors.textMuted },
});
