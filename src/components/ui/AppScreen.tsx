import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, useSafeAreaInsets, type Edge } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { colors } from '../../theme';

interface Props {
  children: React.ReactNode;
  /** Varsayılan: dört kenar. Alt kenarı liste kendisi yönetiyorsa çıkarılabilir. */
  edges?: Edge[];
  /** Üstteki çok hafif mor ışıma (dekoratif). */
  glow?: boolean;
  style?: StyleProp<ViewStyle>;
}

const TUM_KENARLAR: Edge[] = ['top', 'bottom', 'left', 'right'];

/** Her sayfanın altında çok küçük gösterilen geliştirici bilgisi (kullanıcı isteği, 2026-09-22). */
export const GELISTIRICI_METNI = 'Geliştirici: Dursun Can Poyraz';
export const GELISTIRICI_EPOSTA = 'dursun@poyrazmuhasebe.com';

/**
 * Her ekranın kökü: güvenli alan (çentik, Android sistem çubukları) +
 * koyu zemin + üstte hafif dekoratif ışıma + en altta küçük geliştirici
 * satırı. İçerik sistem gezinme çubuğuyla çakışmaz.
 */
export default function AppScreen({ children, edges = TUM_KENARLAR, glow = true, style }: Props) {
  const insets = useSafeAreaInsets();
  // Alt kenarı güvenli alana bırakmayan ekranlarda satır sistem çubuğunun
  // altında kalmasın.
  const altBosluk = edges.includes('bottom') ? 0 : insets.bottom;
  return (
    <View style={styles.kok}>
      {glow && (
        <LinearGradient
          pointerEvents="none"
          colors={[colors.glow, colors.transparent]}
          style={styles.isima}
        />
      )}
      <SafeAreaView style={styles.guvenli} edges={edges}>
        <View style={[styles.icerik, style]}>{children}</View>
        <View style={[styles.gelistiriciKutusu, { paddingBottom: 2 + altBosluk }]} accessible>
          <Text style={styles.gelistirici} numberOfLines={1} allowFontScaling={false}>
            {GELISTIRICI_METNI}
          </Text>
          <Text style={styles.gelistirici} numberOfLines={1} allowFontScaling={false} selectable>
            {GELISTIRICI_EPOSTA}
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  kok: { flex: 1, backgroundColor: colors.background },
  guvenli: { flex: 1 },
  icerik: { flex: 1 },
  isima: { position: 'absolute', top: 0, left: 0, right: 0, height: 320 },
  gelistiriciKutusu: { paddingTop: 2 },
  gelistirici: {
    fontSize: 10,
    lineHeight: 13,
    textAlign: 'center',
    color: colors.textMuted,
    opacity: 0.8,
  },
});
