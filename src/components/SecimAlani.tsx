import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { SecenekOgesi } from '../constants/faturaConstants';
import { TOUCH_MIN, colors, radius, spacing, typography } from '../theme';
import AppDialog from './ui/AppDialog';
import { alanStilleri } from './ui/DateField';
import Icon from './ui/Icon';
import { TextButton } from './ui/Buttons';

interface Props {
  label: string;
  value: string;
  secenekler: SecenekOgesi[];
  onSelect: (value: string) => void;
  disabled?: boolean;
  zorunlu?: boolean;
}

/**
 * Modüler, yeniden kullanılabilir seçim alanı (AppSelect) — Para Birimi,
 * Fatura Tipi, Ülke, Birim, Vergi Türü, Tevkifat Kodu, KDV gibi tüm
 * sabit-liste seçimlerinde kullanılır. Görünümü AppInput/DateField ile aynı;
 * seçenekler temalı bir dialog'da listelenir. Seçim davranışı (onSelect,
 * disabled seçenekler) önceki sürümle aynıdır.
 */
export default function SecimAlani({ label, value, secenekler, onSelect, disabled, zorunlu }: Props) {
  const [acik, setAcik] = useState(false);
  const secili = secenekler.find((s) => s.value === value);

  return (
    <>
      <Pressable
        disabled={disabled}
        onPress={() => setAcik(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${secili?.label ?? 'Seçiniz'}`}
        accessibilityState={{ disabled: !!disabled, expanded: acik }}
        style={({ pressed }) => [styles.alan, pressed && styles.basili, disabled && styles.pasif]}
      >
        <View style={styles.metinler}>
          <Text style={styles.etiket} numberOfLines={1}>
            {label}
            {zorunlu ? ' *' : ''}
          </Text>
          <Text style={[typography.body, !secili && styles.yerTutucu, disabled && styles.pasifYazi]} numberOfLines={2}>
            {secili?.label ?? 'Seçiniz'}
          </Text>
        </View>
        <Icon name="chevron-down" size={22} color={disabled ? colors.textMuted : colors.textSecondary} />
      </Pressable>

      <AppDialog
        visible={acik}
        onDismiss={() => setAcik(false)}
        title={label}
        actions={
          <TextButton onPress={() => setAcik(false)} compact>
            Kapat
          </TextButton>
        }
      >
        <View style={styles.liste} accessibilityRole="radiogroup">
          {secenekler.map((s) => {
            const seciliMi = s.value === value;
            return (
              <Pressable
                key={s.value}
                disabled={s.disabled}
                onPress={() => {
                  onSelect(s.value);
                  setAcik(false);
                }}
                accessibilityRole="radio"
                accessibilityState={{ checked: seciliMi, disabled: !!s.disabled }}
                android_ripple={{ color: colors.primarySoft }}
                style={[styles.secenek, seciliMi && styles.seciliSecenek]}
              >
                <Icon
                  name={seciliMi ? 'radiobox-marked' : 'radiobox-blank'}
                  size={22}
                  color={s.disabled ? colors.textMuted : seciliMi ? colors.primary : colors.textSecondary}
                />
                <Text style={[typography.body, styles.secenekYazi, s.disabled && styles.pasifYazi]}>{s.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </AppDialog>
    </>
  );
}

const styles = StyleSheet.create({
  alan: alanStilleri.alan,
  basili: { borderColor: colors.primary },
  pasif: { backgroundColor: colors.surface, borderColor: colors.border },
  metinler: { flex: 1, minWidth: 0, gap: 2 },
  etiket: { ...typography.caption, color: colors.textSecondary },
  yerTutucu: { color: colors.textMuted },
  pasifYazi: { color: colors.textMuted },
  liste: { gap: 2, marginHorizontal: -spacing.xs },
  secenek: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: TOUCH_MIN + 4,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.small,
    overflow: 'hidden',
  },
  seciliSecenek: { backgroundColor: colors.primarySoft },
  secenekYazi: { flex: 1 },
});
