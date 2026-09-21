import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { TOUCH_MIN, colors, ikonRengi, radius, spacing, typography } from '../../theme';
import Icon, { type IconName } from './Icon';

interface Props {
  children: React.ReactNode;
  onPress?: () => void;
  icon?: IconName;
  /** İkonun rengi; verilmezse ikonun anlamından (theme/ikonRenkleri) seçilir. */
  iconColor?: string;
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

interface Gorunum {
  zemin: string;
  yazi: string;
  kenar?: string;
  /** Bu varyantta ikon anlamına göre renklendirilsin mi (dolu zeminlerde hayır). */
  renkliIkon: boolean;
}

/**
 * Tek tip düğme ailesi. Kendi bileşenimiz (Paper Button değil): ikon ile
 * yazı arasında sabit boşluk, dikeyde ortalı; Paper'ın iç kenar boşlukları
 * ikonun kaymasına yol açıyordu. Pasif durum yalnızca saydamlıkla değil,
 * gri zemin + gri yazıyla da belli olur.
 *
 *  - PrimaryButton   : lavanta dolu — ekranın ana eylemi
 *  - SecondaryButton : koyu, kenarlıklı — ikincil eylemler ("Satır Ekle")
 *  - DangerButton    : yıkıcı eylemler; DangerSoftButton kart içi küçük hali
 *  - SuccessSoftButton: olumlu onay ("Talep Kabul Et")
 *  - TextButton      : üçüncül ("Vazgeç", "Şimdilik atla")
 */
function temel(g: Gorunum) {
  return function Dugme({
    children,
    onPress,
    icon,
    iconColor,
    loading,
    disabled,
    compact,
    fullWidth,
    accessibilityLabel,
    style,
    testID,
  }: Props) {
    const pasif = !!disabled || !!loading;
    const yaziRengi = disabled ? colors.textMuted : g.yazi;
    const ikonRengiSon = disabled
      ? colors.textMuted
      : (iconColor ?? (g.renkliIkon ? ikonRengi(icon) : undefined) ?? g.yazi);
    const metin = typeof children === 'string' ? children : undefined;

    return (
      <Pressable
        onPress={onPress}
        disabled={pasif}
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? metin}
        accessibilityState={{ disabled: pasif, busy: !!loading }}
        android_ripple={{ color: colors.primarySoft }}
        style={({ pressed }) => [
          styles.dugme,
          compact ? styles.kucuk : styles.normal,
          { backgroundColor: disabled ? colors.surfaceSoft : g.zemin },
          g.kenar ? { borderWidth: 1, borderColor: disabled ? colors.border : g.kenar } : null,
          fullWidth && styles.tam,
          pressed && styles.basili,
          style,
        ]}
      >
        <View style={styles.icerik}>
          {loading ? (
            <ActivityIndicator size="small" color={yaziRengi} />
          ) : icon ? (
            <Icon name={icon} size={compact ? 18 : 20} color={ikonRengiSon} />
          ) : null}
          <Text
            style={[typography.button, styles.yazi, compact && styles.kucukYazi, { color: yaziRengi }]}
            numberOfLines={2}
            allowFontScaling
          >
            {children}
          </Text>
        </View>
      </Pressable>
    );
  };
}

export const PrimaryButton = temel({ zemin: colors.primary, yazi: colors.onPrimary, renkliIkon: false });
export const SecondaryButton = temel({
  zemin: colors.surfaceElevated,
  yazi: colors.textPrimary,
  kenar: colors.borderStrong,
  renkliIkon: true,
});
export const DangerButton = temel({ zemin: colors.danger, yazi: colors.onPrimary, renkliIkon: false });
/** Kart içindeki "Sil" gibi küçük yıkıcı eylemler: yumuşak kırmızı zemin. */
export const DangerSoftButton = temel({
  zemin: colors.dangerBackground,
  yazi: colors.danger,
  kenar: colors.dangerBorder,
  renkliIkon: false,
});
/** Olumlu onay ("Talep Kabul Et"): yumuşak yeşil. */
export const SuccessSoftButton = temel({
  zemin: colors.successBackground,
  yazi: colors.success,
  kenar: colors.successBorder,
  renkliIkon: false,
});
export const TextButton = temel({ zemin: colors.transparent, yazi: colors.primary, renkliIkon: true });

const styles = StyleSheet.create({
  dugme: {
    borderRadius: radius.medium,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  normal: { minHeight: 50, paddingHorizontal: spacing.lg, paddingVertical: spacing.xs },
  kucuk: { minHeight: TOUCH_MIN, paddingHorizontal: spacing.md, paddingVertical: spacing.xxs },
  tam: { alignSelf: 'stretch' },
  basili: { opacity: 0.85 },
  icerik: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  kucukYazi: { fontSize: 14, lineHeight: 18 },
  yazi: { flexShrink: 1, textAlign: 'center' },
});
