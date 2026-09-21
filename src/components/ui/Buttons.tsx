import React from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Button } from 'react-native-paper';

import { TOUCH_MIN, colors, radius, typography } from '../../theme';
import type { IconName } from './Icon';

interface Props {
  children: React.ReactNode;
  onPress?: () => void;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  /** Kart içi küçük eylemler için daha alçak düğme (yine ≥ 44dp). */
  compact?: boolean;
  /** Yatayda tüm genişlik. */
  fullWidth?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Tek tip düğme ailesi. Paper Button üstüne kurulu (erişilebilirlik rolü,
 * ripple, yükleniyor durumu ondan gelir). Pasif durum yalnızca saydamlıkla
 * değil, gri zemin + gri yazıyla da belli olur.
 *
 *  - PrimaryButton   : lavanta dolu — ekranın ana eylemi
 *  - SecondaryButton : koyu, kenarlıklı — ikincil eylemler ("Satır Ekle")
 *  - DangerButton    : yıkıcı eylemler; `soft` ile kart içi küçük hali
 *  - TextButton      : üçüncül ("Vazgeç", "Şimdilik atla")
 */
function temel(
  mod: 'contained' | 'outlined' | 'text',
  renkler: { zemin?: string; yazi: string; kenar?: string },
) {
  return function Dugme({
    children,
    onPress,
    icon,
    loading,
    disabled,
    compact,
    fullWidth,
    accessibilityLabel,
    style,
    testID,
  }: Props) {
    return (
      <Button
        mode={mod}
        onPress={onPress}
        icon={icon}
        loading={loading}
        disabled={disabled || loading}
        buttonColor={mod === 'contained' && !disabled ? renkler.zemin : undefined}
        textColor={disabled ? undefined : renkler.yazi}
        accessibilityLabel={accessibilityLabel}
        testID={testID}
        style={[
          styles.dugme,
          renkler.kenar && !disabled ? { borderColor: renkler.kenar } : null,
          mod === 'outlined' && !disabled && renkler.zemin ? { backgroundColor: renkler.zemin } : null,
          fullWidth && styles.tam,
          style,
        ]}
        contentStyle={compact ? styles.icerikKucuk : styles.icerik}
        labelStyle={[typography.button, compact && styles.etiketKucuk]}
      >
        {children}
      </Button>
    );
  };
}

export const PrimaryButton = temel('contained', { zemin: colors.primary, yazi: colors.onPrimary });
export const SecondaryButton = temel('outlined', {
  zemin: colors.surfaceElevated,
  yazi: colors.textPrimary,
  kenar: colors.borderStrong,
});
export const DangerButton = temel('contained', { zemin: colors.danger, yazi: colors.onPrimary });
/** Kart içindeki "Sil" gibi küçük yıkıcı eylemler: yumuşak kırmızı zemin. */
export const DangerSoftButton = temel('outlined', {
  zemin: colors.dangerBackground,
  yazi: colors.danger,
  kenar: colors.dangerBorder,
});
/** Olumlu onay ("Talep Kabul Et"): yumuşak yeşil. */
export const SuccessSoftButton = temel('outlined', {
  zemin: colors.successBackground,
  yazi: colors.success,
  kenar: colors.successBorder,
});
export const TextButton = temel('text', { yazi: colors.primary });

const styles = StyleSheet.create({
  dugme: { borderRadius: radius.medium },
  tam: { alignSelf: 'stretch' },
  icerik: { minHeight: 50, paddingHorizontal: 8 },
  icerikKucuk: { minHeight: TOUCH_MIN, paddingHorizontal: 4 },
  etiketKucuk: { fontSize: 14, marginVertical: 0, marginHorizontal: 12 },
});
